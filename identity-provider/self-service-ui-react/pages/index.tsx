import { DocsButton, MarginCard, LogoutLink } from "../pkg";
import ory from "../pkg/sdk";
import { Card, CardTitle, P, H2, H3, CodeBox } from "@ory/themes";
import { AxiosError } from "axios";
import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const Home: NextPage = () => {
  const [session, setSession] = useState<string>(
    "No valid Ory Session was found.\nPlease sign in to receive one."
  );
  const [hasSession, setHasSession] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("");
  const router = useRouter();

  if (typeof window !== "undefined" && !router.isReady) {
    return null;
  }

  const {
    flow,
    aal = "",
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
        setSession(JSON.stringify(resp.data, null, 2));
        setHasSession(true);
        
        // Extract user name from session
        const identity = resp.data.identity;
        if (identity?.traits?.email) {
          setUserName(identity.traits.email);
        } else if (identity?.traits?.name) {
          setUserName(identity.traits.name);
        }
      })
      .catch((err: AxiosError) => {
        switch (err.response?.status) {
          case 403:
          case 422: {
            if (login_challenge && typeof login_challenge === "string") {
              initFlowQuery.append("login_challenge", login_challenge);
            }
            return router.push(`/login?${initFlowQuery.toString()}`);
          }
          case 401:
            return;
        }
        return Promise.reject(err);
      });
  }, [router]);

  const quickActions = [
    {
      title: "Login",
      href: "/login",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
      ),
      disabled: hasSession,
      testid: "login",
      color: "blue",
    },
    {
      title: "Sign Up",
      href: "/registration",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      disabled: hasSession,
      testid: "sign-up",
      color: "green",
    },
    {
      title: "Account Settings",
      href: "/settings",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      disabled: !hasSession,
      testid: "account-settings",
      color: "purple",
    },
    {
      title: "Recover Account",
      href: "/recovery",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
      disabled: hasSession,
      testid: "recover-account",
      color: "orange",
    },
    {
      title: "Verify Account",
      href: "/verification",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      disabled: false,
      testid: "verify-account",
      color: "teal",
    },
    {
      title: "Logout",
      onClick: LogoutLink(Array.from(initFlowQuery)),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      ),
      disabled: !hasSession,
      testid: "logout",
      color: "red",
    },
  ];

  const docLinks = [
    {
      title: "Get Started",
      href: "https://www.ory.sh/docs/get-started",
      description: "Quick start guide to get up and running",
      icon: "🚀",
    },
    {
      title: "User Flows",
      href: "https://www.ory.sh/docs/concepts/self-service",
      description: "Learn about authentication flows",
      icon: "🔄",
    },
    {
      title: "Identities",
      href: "https://www.ory.sh/docs/concepts/identity",
      description: "Understand identity management",
      icon: "👤",
    },
    {
      title: "Sessions",
      href: "https://www.ory.sh/docs/concepts/session",
      description: "Session handling and security",
      icon: "🔐",
    },
    {
      title: "Bring Your Own UI",
      href: "https://www.ory.sh/docs/guides/bring-your-user-interface",
      description: "Customize the user interface",
      icon: "🎨",
    },
  ];

  return (
    <>
      <Head>
        <title>Ory NextJS Integration - Dashboard</title>
        <meta name="description" content="Secure authentication powered by Ory" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  {hasSession ? `Welcome back${userName ? `, ${userName}` : ''}!` : 'Welcome to Ory'}
                </h1>
                <p className="text-blue-100 text-lg">
                  {hasSession 
                    ? 'Your secure authentication dashboard'
                    : 'Enterprise-grade authentication made simple'
                  }
                </p>
              </div>
              <div className="hidden md:block">
                <svg className="w-24 h-24 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Status Card */}
          {hasSession && (
            <div className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-green-900">Active Session</h3>
                  <p className="text-sm text-green-700">You are currently signed in and authenticated</p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActions.map((action) => {
                const colorClasses = {
                  blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
                  green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
                  purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
                  orange: 'from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
                  teal: 'from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700',
                  red: 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
                };

                const content = (
                  <div className={`
                    relative overflow-hidden rounded-xl shadow-md transition-all duration-200
                    ${action.disabled 
                      ? 'bg-gray-100 cursor-not-allowed opacity-50' 
                      : `bg-gradient-to-r ${colorClasses[action.color as keyof typeof colorClasses]} cursor-pointer transform hover:-translate-y-1 hover:shadow-xl`
                    }
                  `}>
                    <div className="p-6 text-white">
                      <div className="flex items-center justify-between mb-3">
                        <div className={action.disabled ? 'opacity-50' : ''}>{action.icon}</div>
                        {action.disabled && (
                          <span className="text-xs bg-gray-600 text-white px-2 py-1 rounded-full">
                            Unavailable
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold">{action.title}</h3>
                    </div>
                  </div>
                );

                if (action.disabled) {
                  return (
                    <div key={action.testid} data-testid={action.testid}>
                      {content}
                    </div>
                  );
                }

                if (action.onClick) {
                  return (
                    <button
                      key={action.testid}
                      onClick={action.onClick}
                      data-testid={action.testid}
                      className="text-left w-full"
                    >
                      {content}
                    </button>
                  );
                }

                return (
                  <Link key={action.testid} href={action.href!}>
                    <div data-testid={action.testid}>
                      {content}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Documentation */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Documentation
                  </h2>
                </div>
                <div className="p-6 space-y-3">
                  {docLinks.map((doc) => (
                    <a
                      key={doc.title}
                      href={doc.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
                    >
                      <div className="flex items-start">
                        <span className="text-2xl mr-3">{doc.icon}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                            {doc.title}
                          </h3>
                          <p className="text-xs text-gray-600 mt-1">{doc.description}</p>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Session Information */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-4">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Session Information
                  </h2>
                </div>
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-4">
                    {hasSession 
                      ? 'Your current session details are displayed below in JSON format.'
                      : 'No active session found. Please sign in to view your session information.'
                    }
                  </p>
                  <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                    <pre 
                      data-testid="session-content"
                      className="text-sm text-green-400 font-mono"
                      style={{ margin: 0 }}
                    >
                      {session}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-blue-600 mt-1 mr-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">About This UI</h3>
                <p className="text-sm text-blue-800">
                  This is the Ory Managed UI, implementing a complete user interface for all self-service flows including login, registration, recovery, verification, and settings. While perfect for getting started quickly, you'll likely want to implement your own custom interface for production use.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-200 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between">
              <p className="text-sm text-gray-500">
                Powered by <span className="font-semibold text-gray-700">Ory</span>
              </p>
              <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                <a href="https://www.ory.sh" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-700">
                  Learn More
                </a>
                <a href="https://github.com/ory" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-700">
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
