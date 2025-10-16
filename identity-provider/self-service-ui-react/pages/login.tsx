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
  const [session, setSession] = useState<string>("");
  const [hasSession, setHasSession] = useState<boolean>(false);

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

  ory.frontend
    .toSession()
    .then((resp) => {
      setSession(JSON.stringify(resp.data, null, 2));
      setHasSession(true);
    })
    .catch((err: AxiosError) => {
      switch (err.response?.status) {
        case 403:
        // This is a legacy error code thrown. See code 422 for
        // more details.
        case 422:
          // This status code is returned when we are trying to
          // validate a session which has not yet completed
          // its second factor
          return router.push(
            `/login?aal=aal2&via=email&return_to=${window.location.href}`
          );
        case 401:
          // do nothing, the user is not logged in
          return;
      }

      // Something else happened!
      return Promise.reject(err);
    });

  const initFlowQuery = new URLSearchParams({
    aal: aal.toString(),
    refresh: hasSession ? "true" : refresh.toString(),
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
  const onLogout = LogoutLink(Array.from(initFlowQuery));

  useEffect(() => {
    const fetchLogoutUrl = async () => {
      if (flow && (flow.requested_aal === "aal2" || flow.refresh)) {
        try {
          const { data } = await ory.frontend.createBrowserLogoutFlow({
            returnTo: returnTo ? String(returnTo) : flow.return_to || "",
          });
          setLogoutUrl(data.logout_url);
        } catch (err) {
          console.error("Unable to create logout URL", err);
        }
      }
    };
    fetchLogoutUrl();
  }, [flow, returnTo]);

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

    const createFlowParams: {
      refresh?: boolean;
      aal: string;
      via?: string;
      returnTo?: string;
      loginChallenge?: string;
      organization?: string;
      identitySchema?: string;
      flow?: LoginFlow;
    } = {
      refresh: Boolean(refresh),
      via: via ? String(via) : "email",
      aal: "aal1",
    };

    if (aal) createFlowParams.aal = String(aal);
    if (returnTo) createFlowParams.returnTo = String(returnTo);
    if (login_challenge)
      createFlowParams.loginChallenge = String(login_challenge);
    if (organization) createFlowParams.organization = String(organization);
    if (identitySchema)
      createFlowParams.identitySchema = String(identitySchema);
    if (flow) createFlowParams.flow = flow;

    if (login_challenge) {
      createFlowParams.loginChallenge = String(login_challenge);
    }

    ory.frontend
      .createBrowserLoginFlow(createFlowParams)
      .then(({ data }) => {
        if (data?.oauth2_login_request) {
          console.log(
            "Created new login flow with OAuth2 context:",
            data.oauth2_login_request
          );
        } else {
          console.log("Created new login flow without OAuth2 context");
        }
        setFlow(data);
      })
      .catch(handleFlowError(router, "login", setFlow));
  }, [
    flowId,
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

            if (data.session && flow?.return_to) {
              window.location.href = flow.return_to;
              return;
            }

            if (flow?.return_to) {
              window.location.href = flow.return_to;
              return;
            }

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

  const renderOAuth2ClientInfo = () => {
    const oauth2Request: OAuth2LoginRequest | undefined =
      flow?.oauth2_login_request;
    if (!oauth2Request) return null;

    return (
      <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shadow-sm">
        <div className="flex items-start space-x-4">
          {oauth2Request.client?.logo_uri && (
            <div className="flex-shrink-0">
              <img
                src={oauth2Request.client.logo_uri}
                alt="Client logo"
                className="w-16 h-16 rounded-lg object-contain bg-white p-2 shadow-sm"
              />
            </div>
          )}
          <div className="flex-1">
            <p className="text-gray-800 leading-relaxed">
              <span className="font-semibold text-blue-900 text-lg block mb-1">
                {oauth2Request.client?.client_name ||
                  oauth2Request.client?.client_id ||
                  "An application"}
              </span>
              <span className="text-sm text-gray-600">
                is requesting access to your account
              </span>
            </p>
          </div>
          <div className="flex-shrink-0">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
        </div>
      </div>
    );
  };

  const getPageTitle = () => {
    if (flow?.refresh) {
      return "Confirm Action";
    } else if (flow?.requested_aal === "aal2") {
      return "Two-Factor Authentication";
    }
    return "Sign In";
  };

  const getPageIcon = () => {
    if (flow?.refresh) {
      return (
        <svg
          className="w-8 h-8 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    } else if (flow?.requested_aal === "aal2") {
      return (
        <svg
          className="w-8 h-8 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      );
    }
    return (
      <svg
        className="w-8 h-8 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    );
  };

  return (
    <>
      <Head>
        <title>{getPageTitle()} - Ory NextJS Integration</title>
        <meta
          name="description"
          content="Secure authentication powered by Ory"
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Main Card */}
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-white/20 backdrop-blur-sm rounded-full">
                {getPageIcon()}
              </div>
              <h1 className="text-2xl font-bold text-white text-center">
                {getPageTitle()}
              </h1>
            </div>

            {/* Content */}
            <div className="px-8 py-6">
              {renderOAuth2ClientInfo()}

              <Flow onSubmit={onSubmit} flow={flow} />
            </div>
          </div>

          {/* Action Links */}
          <div className="mt-6 space-y-3">
            {aal || refresh ? (
              <div className="bg-white shadow-md rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
                {logoutUrl ? (
                  <a
                    data-testid="logout-link"
                    href={logoutUrl}
                    onClick={(e) => {
                      e.preventDefault();
                      window.location.href = logoutUrl;
                    }}
                    className="flex items-center justify-center space-x-2 px-6 py-4 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    <span className="font-medium">Log out</span>
                  </a>
                ) : (
                  <button
                    data-testid="logout-link"
                    onClick={onLogout}
                    className="w-full flex items-center justify-center space-x-2 px-6 py-4 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    <span className="font-medium">Log out</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                <Link href={getRegistrationUrl()} passHref>
                  <div className="block bg-white shadow-md rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all hover:border-blue-300 group">
                    <div className="flex items-center justify-center space-x-2 px-6 py-4 text-gray-700 group-hover:bg-gradient-to-r group-hover:from-blue-50 group-hover:to-indigo-50 transition-colors">
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                        />
                      </svg>
                      <span className="font-medium">Create account</span>
                    </div>
                  </div>
                </Link>

                {!flow?.refresh && (
                  <Link href={getRecoveryUrl()} passHref>
                    <div className="block bg-white shadow-md rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all hover:border-blue-300 group">
                      <div className="flex items-center justify-center space-x-2 px-6 py-4 text-gray-700 group-hover:bg-gradient-to-r group-hover:from-blue-50 group-hover:to-indigo-50 transition-colors">
                        <svg
                          className="w-5 h-5 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                          />
                        </svg>
                        <span className="font-medium">
                          Recover your account
                        </span>
                      </div>
                    </div>
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Security Notice */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 flex items-center justify-center">
              <svg
                className="w-4 h-4 inline mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Secured by Ory
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
