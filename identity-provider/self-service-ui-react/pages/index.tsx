import {
  DocsButton,
  MarginCard,
  LogoutLink,
  isQuerySet,
  getUrlForFlow,
  defaultConfig,
} from "../pkg";
import ory from "../pkg/sdk";
import { Card, CardTitle, P, H2, H3, CodeBox } from "@ory/themes";
import { AxiosError } from "axios";
import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const Home: NextPage = () => {
  const [session, setSession] = useState<string>(
    "No valid Ory Session was found.\nPlease sign in to receive one."
  );
  const [hasSession, setHasSession] = useState<boolean>(false);
  const router = useRouter();
  // const onLogout = LogoutLink();
  const {
    flow,
    aal = "aal2",
    refresh = "",
    return_to = "",
    organization = "",
    via = "",
    login_challenge,
    identity_schema,
  } = router?.query;

  const initFlowQuery = new URLSearchParams({
    aal: aal.toString(),
    refresh: refresh.toString(),
    return_to: return_to.toString(),
    organization: organization.toString(),
    via: via.toString(),
    flow: flow ? flow.toString() : "",
  });

  useEffect(() => {
    ory.frontend
      .toSession()
      .then((resp) => {
        if (resp.data.authenticator_assurance_level === "aal2") {
          console.log("User has completed 2FA");
          setSession(JSON.stringify(resp.data, null, 2));
          setHasSession(true);
        } else {
          console.log("User has not completed 2FA");

          if (isQuerySet(login_challenge)) {
            initFlowQuery.append("login_challenge", login_challenge);
          }
          if (isQuerySet(identity_schema)) {
            initFlowQuery.append("identity_schema", identity_schema);
          }

          // const initFlowUrl = getUrlForFlow(
          //   defaultConfig().kratosBrowserUrl,
          //   "login",
          //   initFlowQuery
          // );

          router.push(`/login?${initFlowQuery.toString()}`);
        }
      })
      .catch((err: AxiosError) => {
        switch (err.response?.status) {
          case 403:
          case 422: {
            // Session exists but 2FA not completed, redirect to login with AAL2
            const loginChallenge = router.query.login_challenge;
            const params = new URLSearchParams({
              aal: "aal2",
              via: "email",
              return_to: window.location.href,
            });

            if (loginChallenge && typeof loginChallenge === "string") {
              params.append("login_challenge", loginChallenge);
            }

            return router.push(`/login?${params.toString()}`);
          }
          case 401:
            // User not logged in, no redirect needed
            return;
        }
        // Unexpected error
        return Promise.reject(err);
      });
  }, [router]);

  return (
    <div className={"container-fluid"}>
      <Head>
        <title>Ory NextJS Integration Example</title>
        <meta name="description" content="NextJS + React + Vercel + Ory" />
      </Head>

      <MarginCard wide>
        <CardTitle>Welcome to Ory!</CardTitle>
        <P>
          Welcome to the Ory Managed UI. This UI implements a run-of-the-mill
          user interface for all self-service flows (login, registration,
          recovery, verification, settings). The purpose of this UI is to help
          you get started quickly. In the long run, you probably want to
          implement your own custom user interface.
        </P>
        <div className="row">
          <div className="col-md-4 col-xs-12">
            <div className="box">
              <H3>Documentation</H3>
              <P>
                Here are some useful documentation pieces that help you get
                started.
              </P>
              <div className="row">
                <DocsButton
                  title="Get Started"
                  href="https://www.ory.sh/docs/get-started"
                  testid="get-started"
                />
                <DocsButton
                  title="User Flows"
                  href="https://www.ory.sh/docs/concepts/self-service"
                  testid="user-flows"
                />
                <DocsButton
                  title="Identities"
                  href="https://www.ory.sh/docs/concepts/identity"
                  testid="identities"
                />
                <DocsButton
                  title="Sessions"
                  href="https://www.ory.sh/docs/concepts/session"
                  testid="sessions"
                />
                <DocsButton
                  title="Bring Your Own UI"
                  href="https://www.ory.sh/docs/guides/bring-your-user-interface"
                  testid="customize-ui"
                />
              </div>
            </div>
          </div>
          <div className="col-md-8 col-xs-12">
            <div className="box">
              <H3>Session Information</H3>
              <P>
                Below you will find the decoded Ory Session if you are logged
                in.
              </P>
              <CodeBox
                data-testid="session-content"
                className="code"
                style={{ color: "black" }}
                code={session}
              />
            </div>
          </div>
        </div>
      </MarginCard>

      <Card wide>
        <H2>Other User Interface Screens</H2>
        <div className={"row"}>
          <DocsButton
            unresponsive
            testid="login"
            href="/login"
            disabled={hasSession}
            title={"Login"}
          />
          <DocsButton
            unresponsive
            testid="sign-up"
            href="/registration"
            disabled={hasSession}
            title={"Sign Up"}
          />
          <DocsButton
            unresponsive
            testid="recover-account"
            href="/recovery"
            disabled={hasSession}
            title="Recover Account"
          />
          <DocsButton
            unresponsive
            testid="verify-account"
            href="/verification"
            title="Verify Account"
          />
          <DocsButton
            unresponsive
            testid="account-settings"
            href="/settings"
            disabled={!hasSession}
            title={"Account Settings"}
          />
          <DocsButton
            unresponsive
            testid="logout"
            onClick={LogoutLink(Array.from(initFlowQuery))}
            disabled={!hasSession}
            title={"Logout"}
          />
        </div>
      </Card>
    </div>
  );
};

export default Home;
