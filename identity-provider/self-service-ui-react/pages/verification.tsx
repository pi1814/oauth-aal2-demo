// pages/verification.tsx

import { VerificationFlow, UpdateVerificationFlowBody } from "@ory/client"
import { CardTitle } from "@ory/themes"
import { AxiosError } from "axios"
import type { NextPage } from "next"
import Head from "next/head"
import Link from "next/link"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"

import { Flow, ActionCard, CenterLink, MarginCard } from "../pkg"
import ory from "../pkg/sdk"

const Verification: NextPage = () => {
  const [flow, setFlow] = useState<VerificationFlow>()
  const router = useRouter()
  const { flow: flowId, return_to: returnTo } = router.query

  useEffect(() => {
    if (!router.isReady || flow) {
      return
    }

    if (flowId) {
      ory.frontend
        .getVerificationFlow({ id: String(flowId) })
        .then(({ data }) => {
          setFlow(data)
        })
        .catch((err: AxiosError) => {
          switch (err.response?.status) {
            case 410:
            case 403:
              return router.push("/verification")
          }
          throw err
        })
      return
    }

    ory.frontend
      .createBrowserVerificationFlow({
        returnTo: returnTo ? String(returnTo) : undefined,
      })
      .then(({ data }) => {
        setFlow(data)
      })
      .catch((err: AxiosError) => {
        switch (err.response?.status) {
          case 400:
            return router.push("/")
        }
        throw err
      })
  }, [flowId, router, router.isReady, returnTo, flow])

  const onSubmit = async (values: UpdateVerificationFlowBody) => {
    await router.push(`/verification?flow=${flow?.id}`, undefined, { shallow: true })

    ory.frontend
      .updateVerificationFlow({
        flow: String(flow?.id),
        updateVerificationFlowBody: values,
      })
      .then(({ data }) => {
        setFlow(data)
      })
      .catch((err: AxiosError) => {
        switch (err.response?.status) {
          case 400:
            setFlow(err.response?.data as VerificationFlow)
            return
          case 410:
            const newFlowID = (err.response.data as VerificationFlow).return_to
            router.push(`/verification?flow=${newFlowID}`, undefined, {
              shallow: true,
            })

            ory.frontend
              .getVerificationFlow({ id: newFlowID as string })
              .then(({ data }) => setFlow(data))
            return
        }
        throw err
      })
  }

  return (
    <>
      <Head>
        <title>Verify Your Account - Ory NextJS Integration</title>
        <meta name="description" content="Verify your email address to secure your account" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Main Card */}
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-8 py-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-white/20 backdrop-blur-sm rounded-full">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white text-center">
                Verify Your Account
              </h1>
              <p className="text-teal-100 text-center text-sm mt-2">
                Check your email for verification instructions
              </p>
            </div>

            {/* Content */}
            <div className="px-8 py-6">
              {/* Info Banner */}
              <div className="mb-6 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-100">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-teal-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-700">
                      Enter your email address below and we'll send you a verification link to confirm your account.
                    </p>
                  </div>
                </div>
              </div>

              <Flow onSubmit={onSubmit} flow={flow} />

              {/* Help Text */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Need help?
                </h3>
                <ul className="space-y-1.5 text-xs text-gray-600">
                  <li className="flex items-start">
                    <span className="text-teal-500 mr-2">•</span>
                    Check your spam or junk folder if you don't see the email
                  </li>
                  <li className="flex items-start">
                    <span className="text-teal-500 mr-2">•</span>
                    Make sure you entered the correct email address
                  </li>
                  <li className="flex items-start">
                    <span className="text-teal-500 mr-2">•</span>
                    The verification link expires after a certain time
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Links */}
          <div className="mt-6">
            <Link href="/" passHref>
              <div className="block bg-white shadow-md rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all hover:border-teal-300 group">
                <div className="flex items-center justify-center space-x-2 px-6 py-4 text-gray-700 group-hover:bg-gradient-to-r group-hover:from-teal-50 group-hover:to-cyan-50 transition-colors">
                  <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span className="font-medium">Go back to home</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Email Icon Illustration */}
          <div className="mt-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-teal-200 rounded-full blur-2xl opacity-30 animate-pulse"></div>
              <svg className="relative w-32 h-32 text-teal-600/20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 flex items-center justify-center">
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Your email is kept private and secure
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default Verification
