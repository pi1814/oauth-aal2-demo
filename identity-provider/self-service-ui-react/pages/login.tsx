import { LoginFlow, UpdateLoginFlowBody, OAuth2LoginRequest, SuccessfulNativeLogin } from "@ory/client"
import { CardTitle } from "@ory/themes"
import { AxiosError } from "axios"
import type { NextPage } from "next"
import Head from "next/head"
import Link from "next/link"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"

import { ActionCard, CenterLink, LogoutLink, Flow, MarginCard } from "../pkg"
import { handleGetFlowError, handleFlowError } from "../pkg/errors"
import ory from "../pkg/sdk"

const Login: NextPage = () => {
  console.log("Rendering login page")
  const [flow, setFlow] = useState<LoginFlow>()
  const [logoutUrl, setLogoutUrl] = useState<string>("")

  // Get ?flow=... from the URL
  const router = useRouter()
  const {
    return_to: returnTo,
    flow: flowId,
    // Refresh means we want to refresh the session. This is needed, for example, when we want to update the password
    // of a user.
    refresh,
    // AAL = Authorization Assurance Level. This implies that we want to upgrade the AAL, meaning that we want
    // to perform two-factor authentication/verification.
    aal,
    via,
    // OAuth2 login challenge from Hydra
    login_challenge: loginChallenge,
    // Organization for multi-tenancy
    organization,
    // Identity schema selection
    identity_schema: identitySchema,
  } = router.query

  // This might be confusing, but we want to show the user an option
  // to sign out if they are performing two-factor authentication!
  const onLogout = LogoutLink([aal, refresh])

  // Fetch logout URL for 2FA/refresh flows
  useEffect(() => {
    const fetchLogoutUrl = async () => {
      if (flow && (flow.requested_aal === "aal2" || flow.refresh)) {
        try {
          const { data } = await ory.frontend.createBrowserLogoutFlow({
            returnTo: returnTo ? String(returnTo) : flow.return_to || "",
          })
          setLogoutUrl(data.logout_url)
        } catch (err) {
          console.error("Unable to create logout URL", err)
        }
      }
    }

    fetchLogoutUrl()
  }, [flow, returnTo])

  // Handle verification flow redirect for email verification required
  const redirectToVerificationFlow = async (loginFlow: LoginFlow) => {
    try {
      const { data: verificationFlow } = await ory.frontend.createBrowserVerificationFlow({
        returnTo: returnTo ? String(returnTo) : loginFlow.return_to || "",
      })

      const verificationParams = new URLSearchParams({
        flow: verificationFlow.id,
        message: JSON.stringify(loginFlow.ui.messages),
      })

      router.push(`/verification?${verificationParams.toString()}`)
    } catch (err) {
      console.error("Error creating verification flow:", err)
      // Fallback redirect
      const fallbackParams = new URLSearchParams({
        return_to: returnTo ? String(returnTo) : loginFlow.return_to || "",
      })
      if (loginFlow.identity_schema) {
        fallbackParams.append("identity_schema", loginFlow.identity_schema)
      }
      router.push(`/verification?${fallbackParams.toString()}`)
    }
  }

  useEffect(() => {
    // If the router is not ready yet, or we already have a flow, do nothing.
    if (!router.isReady || flow) {
      return
    }

    // If ?flow=.. was in the URL, we fetch it
    if (flowId) {
      ory.frontend
        .getLoginFlow({ id: String(flowId) })
        .then(async ({ data }) => {
          console.log("Fetched existing flow")
          console.log(data)

          // Check if email verification is required (message ID 4000010)
          if (data.ui.messages && data.ui.messages.length > 0) {
            const needsVerification = data.ui.messages.some(
              (msg) => msg.id === 4000010
            )
            if (needsVerification) {
              await redirectToVerificationFlow(data)
              return
            }
          }

          setFlow(data)
        })
        .catch(handleGetFlowError(router, "login", setFlow))
      return
    }

    // Otherwise we initialize it
    const createFlowParams: {
      refresh?: boolean
      aal?: string
      via?: string
      returnTo?: string
      loginChallenge?: string
      organization?: string
      identitySchema?: string
    } = {
      refresh: Boolean(refresh),
      via: via ? String(via) : "email",
    }

    if (aal) createFlowParams.aal = String(aal)
    if (returnTo) createFlowParams.returnTo = String(returnTo)
    if (loginChallenge) createFlowParams.loginChallenge = String(loginChallenge)
    if (organization) createFlowParams.organization = String(organization)
    if (identitySchema) createFlowParams.identitySchema = String(identitySchema)

    ory.frontend
      .createBrowserLoginFlow(createFlowParams)
      .then(({ data }) => {
        console.log("Created new login flow with OAuth2 context:", data.oauth2_login_request)
        setFlow(data)
      })
      .catch(handleFlowError(router, "login", setFlow))
  }, [
    flowId,
    router,
    router.isReady,
    aal,
    refresh,
    returnTo,
    loginChallenge,
    organization,
    identitySchema,
    via,
    flow,
  ])

  const onSubmit = (values: UpdateLoginFlowBody) =>
    router
      // On submission, add the flow ID to the URL but do not navigate. This prevents the user losing
      // his data when she/he reloads the page.
      .push(`/login?flow=${flow?.id}`, undefined, { shallow: true })
      .then(() =>
        ory.frontend
          .updateLoginFlow({
            flow: String(flow?.id),
            updateLoginFlowBody: values,
          })
          // We logged in successfully! Let's bring the user home.
          .then(({ data }) => {
            // For browser flows, check if there's a continue_with action
            // that contains an OAuth2 redirect
            if (data.session && flow?.return_to) {
              window.location.href = flow.return_to
              return
            }

            // Check for continue_with actions (like OAuth2 redirects)
            if (data.continue_with) {
              for (const action of data.continue_with) {
                // Handle redirect_browser_to action
                if (action.action === 'redirect_browser_to' && 'redirect_browser_to' in action) {
                  window.location.href = action.redirect_browser_to
                  return
                }
              }
            }

            // Otherwise use the return_to from the flow
            if (flow?.return_to) {
              window.location.href = flow.return_to
              return
            }

            // Fallback to home page
            router.push("/")
          })
          .then(() => {})
          .catch(handleFlowError(router, "login", setFlow))
          .catch((err: AxiosError) => {
            // If the previous handler did not catch the error it's most likely a form validation error
            if (err.response?.status === 400) {
              // Yup, it is!
              setFlow(err.response?.data as LoginFlow)
              return
            }

            return Promise.reject(err)
          })
      )

  // Get registration URL with OAuth2 context
  const getRegistrationUrl = () => {
    const params = new URLSearchParams()
    
    if (returnTo) params.append("return_to", String(returnTo))
    else if (flow?.return_to) params.append("return_to", flow.return_to)
    
    if (flow?.identity_schema) params.append("identity_schema", flow.identity_schema)
    if (flow?.oauth2_login_request?.challenge) {
      params.append("login_challenge", flow.oauth2_login_request.challenge)
    }
    if (organization) params.append("organization", String(organization))

    return `/registration?${params.toString()}`
  }

  // Get recovery URL with context
  const getRecoveryUrl = () => {
    const params = new URLSearchParams()
    
    if (returnTo) params.append("return_to", String(returnTo))
    else if (flow?.return_to) params.append("return_to", flow.return_to)

    return `/recovery?${params.toString()}`
  }

  // Display OAuth2 client information if available
  const renderOAuth2ClientInfo = () => {
    const oauth2Request: OAuth2LoginRequest | undefined = flow?.oauth2_login_request

    if (!oauth2Request) return null

    return (
      <div className="oauth2-client-info" style={{ marginBottom: "1rem", padding: "1rem", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
        <p style={{ margin: 0, fontSize: "0.9rem", color: "#666" }}>
          <strong>{oauth2Request.client?.client_name || oauth2Request.client?.client_id || "An application"}</strong> is requesting access to your account
        </p>
        {oauth2Request.client?.logo_uri && (
          <img 
            src={oauth2Request.client.logo_uri} 
            alt="Client logo" 
            style={{ maxWidth: "100px", marginTop: "0.5rem" }}
          />
        )}
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Sign in - Ory NextJS Integration Example</title>
        <meta name="description" content="NextJS + React + Vercel + Ory" />
      </Head>
      <MarginCard>
        <CardTitle>
          {(() => {
            if (flow?.refresh) {
              return "Confirm Action"
            } else if (flow?.requested_aal === "aal2") {
              return "Two-Factor Authentication"
            }
            return "Sign In"
          })()}
        </CardTitle>
        
        {renderOAuth2ClientInfo()}
        
        <Flow onSubmit={onSubmit} flow={flow} />
      </MarginCard>
      
      {aal || refresh ? (
        <ActionCard>
          {logoutUrl ? (
            <CenterLink 
              data-testid="logout-link" 
              href={logoutUrl}
              onClick={(e) => {
                e.preventDefault()
                window.location.href = logoutUrl
              }}
            >
              Log out
            </CenterLink>
          ) : (
            <CenterLink data-testid="logout-link" onClick={onLogout}>
              Log out
            </CenterLink>
          )}
        </ActionCard>
      ) : (
        <>
          <ActionCard>
            <Link href={getRegistrationUrl()} passHref>
              <CenterLink>Create account</CenterLink>
            </Link>
          </ActionCard>
          {!flow?.refresh && (
            <ActionCard>
              <Link href={getRecoveryUrl()} passHref>
                <CenterLink>Recover your account</CenterLink>
              </Link>
            </ActionCard>
          )}
        </>
      )}
    </>
  )
}

export default Login
