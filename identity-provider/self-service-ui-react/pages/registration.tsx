// pages/registration.tsx

import { RegistrationFlow, UpdateRegistrationFlowBody } from "@ory/client"
import { CardTitle } from "@ory/themes"
import { AxiosError } from "axios"
import type { NextPage } from "next"
import Head from "next/head"
import Link from "next/link"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import { ActionCard, CenterLink, Flow, MarginCard } from "../pkg"
import { handleFlowError } from "../pkg/errors"
import ory from "../pkg/sdk"

const Registration: NextPage = () => {
  const router = useRouter()
  const [flow, setFlow] = useState<RegistrationFlow>()

  const {
    flow: flowId,
    return_to: returnTo,
    login_challenge,
    identity_schema,
    organization,
  } = router.query as {
    flow?: string
    return_to?: string
    login_challenge?: string
    identity_schema?: string
    organization?: string
  }

  useEffect(() => {
    if (!router.isReady || flow) {
      return
    }

    if (flowId) {
      ory.frontend
        .getRegistrationFlow({
          id: flowId,
          cookie: document.cookie,
        })
        .then(({ data }) => {
          setFlow(data)
        })
        .catch(handleFlowError(router, "registration", setFlow))
      return
    }

    ory.frontend
      .createBrowserRegistrationFlow({
        returnTo: returnTo,
        loginChallenge: login_challenge,
        identitySchema: identity_schema,
        organization: organization,
      })
      .then(({ data }) => {
        setFlow(data)
      })
      .catch(handleFlowError(router, "registration", setFlow))
  }, [
    router.isReady,
    flow,
    flowId,
    returnTo,
    login_challenge,
    identity_schema,
    organization,
  ])

  const onSubmit = async (values: UpdateRegistrationFlowBody) => {
    await router.push(
      {
        pathname: "/registration",
        query: {
          flow: flow?.id,
          return_to: returnTo,
          login_challenge,
          identity_schema,
          organization,
        },
      },
      undefined,
      { shallow: true },
    )

    ory.frontend
      .updateRegistrationFlow({
        flow: String(flow?.id),
        updateRegistrationFlowBody: values,
      })
      .then(async ({ data }) => {
        if (data.continue_with) {
          for (const item of data.continue_with) {
            if (item.action === "show_verification_ui") {
              return router.push(
                {
                  pathname: "/verification",
                  query: { flow: item.flow.id, return_to: returnTo },
                },
                undefined,
                { shallow: true },
              )
            }
          }
        }
        return router.push(flow?.return_to || "/")
      })
      .catch(handleFlowError(router, "registration", setFlow))
      .catch((err: AxiosError) => {
        if (err.response?.status === 400) {
          setFlow(err.response.data as RegistrationFlow)
          return
        }
        return Promise.reject(err)
      })
  }

  const renderOAuth2Info = () => {
    if (!login_challenge) return null;
    
    return (
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-blue-900">Quick Sign Up</span>
              <span className="block text-xs text-gray-600 mt-0.5">
                Create an account to authorize the requesting application
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>Create Account - Ory NextJS Integration</title>
        <meta name="description" content="Create your secure account powered by Ory" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Main Card */}
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-8 py-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-white/20 backdrop-blur-sm rounded-full">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white text-center">
                Create Account
              </h1>
              <p className="text-blue-100 text-center text-sm mt-2">
                Join us and get started in seconds
              </p>
            </div>

            {/* Content */}
            <div className="px-8 py-6">
              {renderOAuth2Info()}
              
              <Flow onSubmit={onSubmit} flow={flow} />
            </div>
          </div>

          {/* Action Links */}
          <div className="mt-6">
            <Link 
              href={{
                pathname: "/login",
                query: { 
                  return_to: returnTo, 
                  login_challenge, 
                  identity_schema, 
                  organization 
                },
              }}
              passHref
            >
              <div className="block bg-white shadow-md rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all hover:border-blue-300 group">
                <div className="flex items-center justify-center space-x-2 px-6 py-4 text-gray-700 group-hover:bg-gradient-to-r group-hover:from-blue-50 group-hover:to-emerald-50 transition-colors">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span className="font-medium">Already have an account? Sign in</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Benefits Section */}
          <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Why create an account?
            </h3>
            <ul className="space-y-2 text-xs text-gray-600">
              <li className="flex items-start">
                <svg className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Secure authentication with industry-standard encryption
              </li>
              <li className="flex items-start">
                <svg className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Access to authorized applications and services
              </li>
              <li className="flex items-start">
                <svg className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Full control over your data and privacy settings
              </li>
            </ul>
          </div>

          {/* Security Notice */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 flex items-center justify-center">
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Secured by Ory
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default Registration
