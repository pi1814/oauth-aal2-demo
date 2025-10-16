// pages/consent.tsx

import { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { OAuth2ConsentRequest } from '@ory/client'

type Props =
  | { redirectTo: string; consentRequest?: never; error?: never }
  | { consentRequest: OAuth2ConsentRequest; redirectTo?: never; error?: never }
  | { error: string; consentRequest?: never; redirectTo?: never }

const Consent: NextPage<Props> = ({ redirectTo, consentRequest: initial, error: ssrError }) => {
  const router = useRouter()
  const { consent_challenge } = router.query as { consent_challenge?: string }
  const [consentRequest, setConsentRequest] = useState<OAuth2ConsentRequest | null>(
    initial ?? null,
  )
  const [error, setError] = useState<string | null>(ssrError ?? null)
  const [loading, setLoading] = useState(initial ? false : true)
  const [csrfToken, setCSRFToken] = useState<string>('')
  const [remember, setRemember] = useState(false)
  const [grantScope, setGrantScope] = useState<string[]>([])

  useEffect(() => {
    if (redirectTo) {
      window.location.href = redirectTo
      return
    }

    if (!initial && router.isReady) {
      if (!consent_challenge) {
        setError('Expected a consent challenge but none was provided')
        setLoading(false)
        return
      }

      ;(async () => {
        try {
          const csrfRes = await fetch('/api/csrf')
          const { token } = await csrfRes.json()
          setCSRFToken(token)

          const res = await fetch(
            `/api/consent?consent_challenge=${encodeURIComponent(consent_challenge)}`,
          )
          if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || 'Failed to fetch consent')
          }

          const json = await res.json()
          if (json.redirect_to) {
            window.location.href = json.redirect_to
            return
          }

          setConsentRequest(json.consentRequest)
          setGrantScope(json.consentRequest.requested_scope ?? [])
        } catch (err) {
          setError((err as Error).message)
        } finally {
          setLoading(false)
        }
      })()
    }
  }, [router.isReady, consent_challenge, redirectTo])

  const handleScopeChange = (scope: string, checked: boolean) => {
    setGrantScope(prev => (checked ? [...prev, scope] : prev.filter(s => s !== scope)))
  }

  const handleSubmit = async (action: 'accept' | 'deny') => {
    if (!consent_challenge) return
    setLoading(true)

    try {
      const res = await fetch('/api/consent?consent_challenge=' + encodeURIComponent(consent_challenge), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          challenge: consent_challenge,
          action,
          grant_scope: grantScope,
          remember,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to submit consent')
      }
      const { redirect_to } = await res.json()
      window.location.href = redirect_to
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white shadow-xl rounded-2xl p-8 border border-red-100">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">Something went wrong</h2>
            <p className="text-red-600 text-center">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!consentRequest) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-slate-50">
        <div className="text-center">
          <div className="text-gray-400 text-lg">No consent request found</div>
        </div>
      </div>
    )
  }

  const clientName = consentRequest.client?.client_name || consentRequest.client?.client_id || 'Unknown Application'

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-white/20 backdrop-blur-sm rounded-full">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white text-center">Authorization Request</h1>
          </div>

          <div className="px-8 py-6">
            {/* Application Info */}
            <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-gray-800 mb-2 text-center">
                <span className="font-semibold text-blue-900 text-lg">{clientName}</span>
                <span className="block text-sm text-gray-600 mt-1">wants to access your account</span>
              </p>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-sm text-gray-700 text-center">
                  Authorizing as <span className="font-semibold text-gray-900">{consentRequest.subject}</span>
                </p>
              </div>
            </div>

            {/* Permissions */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Requested Permissions
              </h2>
              <div className="space-y-2">
                {consentRequest.requested_scope?.map(scope => (
                  <label 
                    key={scope} 
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={grantScope.includes(scope)}
                      onChange={e => handleScopeChange(scope, e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-gray-700 font-medium group-hover:text-gray-900">{scope}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Remember Decision */}
            <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-0.5 cursor-pointer"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 block">Remember my decision</span>
                  <span className="text-xs text-gray-500">Don't ask again for 1 hour</span>
                </div>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <button
                onClick={() => handleSubmit('accept')}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
              >
                Allow Access
              </button>
              <button
                onClick={() => handleSubmit('deny')}
                disabled={loading}
                className="flex-1 bg-white text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 border-2 border-gray-300 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Deny
              </button>
            </div>

            {/* Privacy Policy Link */}
            {consentRequest.client?.policy_uri && (
              <div className="text-center pt-4 border-t border-gray-200">
                <a
                  href={consentRequest.client.policy_uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  View Privacy Policy
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Your credentials are never shared with third-party applications
          </p>
        </div>
      </div>
    </div>
  )
}

export default Consent
