import {
  ActionCard,
  CenterLink,
  LogoutLink,
  Flow,
  MarginCard,
  isQuerySet,
  getUrlForFlow,
  defaultConfig,
} from "../pkg";
import { handleGetFlowError, handleFlowError } from "../pkg/errors";
import ory from "../pkg/sdk";
import {
  LoginFlow,
  UpdateLoginFlowBody,
  OAuth2LoginRequest,
  SuccessfulNativeLogin,
} from "@ory/client";
import { CardTitle } from "@ory/themes";
import { AxiosError } from "axios";
import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const Login: NextPage = () => {
  console.log("Rendering login page");
  const [flow, setFlow] = useState<LoginFlow>();
  const [logoutUrl, setLogoutUrl] = useState<string>("");

  // Get ?flow=... from the URL
  const router = useRouter();
  const {
    return_to: returnTo,
    flow: flowId,
    refresh = "",
    aal = "",
    via = "",
    login_challenge: login_challenge,
    organization = "",
    identity_schema: identitySchema,
    return_to = "",
    identity_schema,
  } = router.query;

  const initFlowQuery = new URLSearchParams({
    aal: aal.toString(),
    refresh: refresh.toString(),
    return_to: return_to.toString(),
    organization: organization.toString(),
    via: via.toString(),
  });

  if (isQuerySet(login_challenge)) {
    initFlowQuery.append("login_challenge", login_challenge);
  }
  if (isQuerySet(identity_schema)) {
    initFlowQuery.append("identity_schema", identity_schema);
  }
  // const onLogout = LogoutLink(Array.from(initFlowQuery));

  // // Fetch logout URL for 2FA/refresh flows
  // useEffect(() => {
  //   const fetchLogoutUrl = async () => {
  //     if (flow && (flow.requested_aal === "aal2" || flow.refresh)) {
  //       try {
  //         const { data } = await ory.frontend.createBrowserLogoutFlow({
  //           returnTo: returnTo ? String(returnTo) : flow.return_to || "",
  //         });
  //         setLogoutUrl(data.logout_url);
  //       } catch (err) {
  //         console.error("Unable to create logout URL", err);
  //       }
  //     }
  //   };
  //   fetchLogoutUrl();
  // }, [flow, returnTo]);

  // Handle verification flow redirect for email verification required
  const redirectToVerificationFlow = async (loginFlow: LoginFlow) => {
    try {
      const { data: verificationFlow } =
        await ory.frontend.createBrowserVerificationFlow({
          returnTo: returnTo ? String(returnTo) : loginFlow.return_to || "",
        });

      const verificationParams = new URLSearchParams({
        flow: verificationFlow.id,
        message: JSON.stringify(loginFlow.ui.messages),
      });

      router.push(`/verification?${verificationParams.toString()}`);
    } catch (err) {
      console.error("Error creating verification flow:", err);
      const fallbackParams = new URLSearchParams({
        return_to: returnTo ? String(returnTo) : loginFlow.return_to || "",
      });
      if (loginFlow.identity_schema) {
        fallbackParams.append("identity_schema", loginFlow.identity_schema);
      }
      router.push(`/verification?${fallbackParams.toString()}`);
    }
  };

  useEffect(() => {
    if (!router.isReady || flow) return;

    if (flowId) {
      ory.frontend
        .getLoginFlow({
          id: String(flowId),
        })
        .then(async ({ data }) => {
          console.log("Fetched existing flow");
          console.log(data);

          // Check if email verification is required (message ID 4000010)
          if (data.ui.messages && data.ui.messages.length > 0) {
            const needsVerification = data.ui.messages.some(
              (msg) => msg.id === 4000010
            );
            if (needsVerification) {
              await redirectToVerificationFlow(data);
              return;
            }
          }

          setFlow(data);
        })
        .catch(handleGetFlowError(router, "login", setFlow));
      return;
    }

    // Initialize new login flow with full OAuth2 context
    const createFlowParams: {
      refresh?: boolean;
      aal?: string;
      via?: string;
      returnTo?: string;
      loginChallenge?: string;
      organization?: string;
      identitySchema?: string;
      flow?: LoginFlow;
    } = {
      refresh: Boolean(refresh),
      via: via ? String(via) : "email",
    };

    if (aal) createFlowParams.aal = String(aal);
    if (returnTo) createFlowParams.returnTo = String(returnTo);
    if (login_challenge)
      createFlowParams.loginChallenge = String(login_challenge);
    if (organization) createFlowParams.organization = String(organization);
    if (identitySchema)
      createFlowParams.identitySchema = String(identitySchema);
    if (flow) createFlowParams.flow = flow;

    ory.frontend
      .createBrowserLoginFlow(createFlowParams)
      .then(({ data }) => {
        console.log(
          "Created new login flow with OAuth2 context:",
          data.oauth2_login_request
        );
        setFlow(data);
      })
      .catch(handleFlowError(router, "login", setFlow));
  }, [
    flowId,
    router,
    router.isReady,
    aal,
    refresh,
    returnTo,
    login_challenge,
    organization,
    identitySchema,
    via,
    flow,
  ]);

  const onSubmit = (values: UpdateLoginFlowBody) =>
    router
      .push(`/login?flow=${flow?.id}`, undefined, { shallow: true })
      .then(() =>
        ory.frontend
          .updateLoginFlow({
            flow: String(flow?.id),
            updateLoginFlowBody: values,
          })
          .then(async ({ data }) => {
            // Handle Hydra OAuth2 login accept flow redirects explicitly
            if (data.continue_with) {
              for (const action of data.continue_with) {
                if (
                  action.action === "redirect_browser_to" &&
                  "redirect_browser_to" in action
                ) {
                  window.location.href = action.redirect_browser_to;
                  return;
                }
              }
            }

            // If session exists and return_to is set, redirect there
            if (data.session && flow?.return_to) {
              window.location.href = flow.return_to;
              return;
            }

            // Fallback to return_to in flow
            if (flow?.return_to) {
              window.location.href = flow.return_to;
              return;
            }

            // Default fallback to homepage
            router.push("/");
          })
          .catch(handleFlowError(router, "login", setFlow))
          .catch((err: AxiosError) => {
            if (err.response?.status === 400) {
              setFlow(err.response?.data as LoginFlow);
              return;
            }
            return Promise.reject(err);
          })
      );

  // Get registration URL with OAuth2 context preserved
  const getRegistrationUrl = () => {
    const initRegistrationQuery = new URLSearchParams({
      return_to: (return_to && return_to.toString()) || flow?.return_to || "",
      ...(flow?.identity_schema && {
        identity_schema: flow.identity_schema.toString(),
      }),
      ...(flow?.oauth2_login_request?.challenge && {
        login_challenge: flow.oauth2_login_request.challenge,
      }),
    });

    const initRegistrationUrl = getUrlForFlow(
      defaultConfig().kratosBrowserUrl,
      "registration",
      initRegistrationQuery
    );
    return initRegistrationUrl;
  };

  // Get recovery URL with context preserved
  const getRecoveryUrl = () => {
    let initRecoveryUrl = "";
    if (!flow?.refresh) {
      initRecoveryUrl = getUrlForFlow(
        defaultConfig().kratosBrowserUrl,
        "recovery",
        new URLSearchParams({
          return_to:
            (return_to && return_to.toString()) || flow?.return_to || "",
        })
      );
    }
    return initRecoveryUrl;
  };

  // Show OAuth2 client info if available
  const renderOAuth2ClientInfo = () => {
    const oauth2Request: OAuth2LoginRequest | undefined =
      flow?.oauth2_login_request;
    if (!oauth2Request) return null;
    return (
      <div
        className="oauth2-client-info"
        style={{
          marginBottom: "1rem",
          padding: "1rem",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
        }}
      >
        <p style={{ margin: 0, fontSize: "0.9rem", color: "#666" }}>
          <strong>
            {oauth2Request.client?.client_name ||
              oauth2Request.client?.client_id ||
              "An application"}
          </strong>{" "}
          is requesting access to your account
        </p>
        {oauth2Request.client?.logo_uri && (
          <img
            src={oauth2Request.client.logo_uri}
            alt="Client logo"
            style={{ maxWidth: "100px", marginTop: "0.5rem" }}
          />
        )}
      </div>
    );
  };

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
              return "Confirm Action";
            } else if (flow?.requested_aal === "aal2") {
              return "Two-Factor Authentication";
            }
            return "Sign In";
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
                e.preventDefault();
                window.location.href = logoutUrl;
              }}
            >
              Log out
            </CenterLink>
          ) : (
            <CenterLink data-testid="logout-link" onClick={LogoutLink(Array.from(initFlowQuery))}>
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
  );
};

export default Login;
