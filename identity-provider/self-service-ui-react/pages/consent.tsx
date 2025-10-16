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

    // Client-side fetch of consentRequest if not provided by SSR
    if (!initial && router.isReady) {
      if (!consent_challenge) {
        setError('Expected a consent challenge but none was provided')
        setLoading(false)
        return
      }

      ;(async () => {
        try {
          // 1. Get CSRF token
          const csrfRes = await fetch('/api/csrf')
          const { token } = await csrfRes.json()
          setCSRFToken(token)

          // 2. Fetch consent via your API route
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error: {error}</div>
      </div>
    )
  }

  if (!consentRequest) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>No consent request found</div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Authorize Application</h1>

        <div className="mb-6">
          <p className="text-gray-700 mb-2">
            <strong>
              {consentRequest.client?.client_name || consentRequest.client?.client_id}
            </strong>{' '}
            wants to access your account
          </p>
          <p className="text-sm text-gray-600">
            User: <strong>{consentRequest.subject}</strong>
          </p>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Requested Permissions:</h2>
          <div className="space-y-2">
            {consentRequest.requested_scope?.map(scope => (
              <label key={scope} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={grantScope.includes(scope)}
                  onChange={e => handleScopeChange(scope, e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">{scope}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Remember my decision for 1 hour</span>
          </label>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={() => handleSubmit('accept')}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
          >
            Allow access
          </button>
          <button
            onClick={() => handleSubmit('deny')}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400 transition-colors"
          >
            Deny access
          </button>
        </div>

        {consentRequest.client?.policy_uri && (
          <div className="mt-4 text-center">
            <a
              href={consentRequest.client.policy_uri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              Privacy Policy
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default Consent
