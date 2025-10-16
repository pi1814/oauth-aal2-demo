import PageError from "../pages/error"
import PageHome from "../pages/index"
import PageLogin from "../pages/login"
import PageRecovery from "../pages/recovery"
import PageRegistration from "../pages/registration"
import PageSettings from "../pages/settings"
import PageVerification from "../pages/verification"

export {
  PageError,
  PageHome,
  PageLogin,
  PageRecovery,
  PageRegistration,
  PageSettings,
  PageVerification,
}

export * from "./hooks"
export * from "./ui"
export * from "./sdk"
export * from "./styled"
export * from "./stub/oidc-cert"


import sdk, { apiBaseUrl } from "./sdk"
import {
  ErrorAuthenticatorAssuranceLevelNotSatisfied,
  OAuth2LogoutRequest,
} from "@ory/client"
import { AxiosError } from "axios"
import { useNavigate } from "react-router-dom"

export const removeTrailingSlash = (s: string) => s.replace(/\/$/, "")
export const getUrlForFlow = (
  base: string,
  flow: string,
  query?: URLSearchParams,
) =>
  `${removeTrailingSlash(base)}/self-service/${flow}/browser${
    query ? `?${query.toString()}` : ""
  }`

export const defaultConfig = () => {
  // Environment variables should be passed differently in React, e.g. via REACT_APP_ or config props
  const HYDRA_ADMIN_URL = process.env.REACT_APP_HYDRA_ADMIN_URL
  const ORY_SDK_URL = process.env.REACT_APP_ORY_SDK_URL
  const CSRF_COOKIE_SECRET = process.env.REACT_APP_CSRF_COOKIE_SECRET
  const CSRF_COOKIE_NAME = process.env.REACT_APP_CSRF_COOKIE_NAME
  const TRUSTED_CLIENT_IDS = process.env.REACT_APP_TRUSTED_CLIENT_IDS

  return {
    apiBaseUrl,
    kratosBrowserUrl: apiBaseUrl,
    faviconUrl: "favico.png",
    faviconType: "image/png",
    isOAuthConsentRouteEnabled: () =>
      HYDRA_ADMIN_URL && ORY_SDK_URL && CSRF_COOKIE_SECRET && CSRF_COOKIE_NAME,
    shouldSkipConsent: (challenge: any) => {
      let trustedClients: string[] = []
      if (TRUSTED_CLIENT_IDS) {
        trustedClients = String(TRUSTED_CLIENT_IDS).split(",")
      }
      return (
        challenge.skip ||
        challenge.client?.skip_consent ||
        (challenge.client?.client_id &&
          trustedClients.indexOf(challenge.client?.client_id) > -1)
      )
    },
    shouldSkipLogoutConsent: (challenge: any) => {
      return Boolean(
        (challenge.client as OAuth2LogoutRequest & {
          skip_logout_consent: boolean
        })?.skip_logout_consent,
      )
    },
    ...sdk,
  }
}

export const isUUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

export const isQuerySet = (x: any): x is string =>
  typeof x === "string" && x.length > 0

const isErrorAuthenticatorAssuranceLevel = (
  err: unknown,
): err is ErrorAuthenticatorAssuranceLevelNotSatisfied => {
  return (
    (err as ErrorAuthenticatorAssuranceLevelNotSatisfied).error?.id ==
    "session_aal2_required"
  )
}

// React hook replacement for redirect on soft error using react-router 'useNavigate'
export const useRedirectOnSoftError = (redirectTo: string) => {
  const navigate = useNavigate()

  return (err: AxiosError) => {
    if (!err.response) {
      throw err // or handle error differently as no response is present
    }

    if (err.response.status === 401) {
      const query = new URLSearchParams()
      query.set("return_to", redirectTo)
      navigate(getUrlForFlow(apiBaseUrl, "login", query))
      return
    }
    if (
      [404, 410, 403].includes(err.response.status)
    ) {
      const authenticatorAssuranceLevelError = err.response.data as unknown
      if (isErrorAuthenticatorAssuranceLevel(authenticatorAssuranceLevelError)) {
        navigate(authenticatorAssuranceLevelError.redirect_browser_to || redirectTo)
      } else {
        navigate(redirectTo)
      }
      return
    }
    throw err
  }
}

