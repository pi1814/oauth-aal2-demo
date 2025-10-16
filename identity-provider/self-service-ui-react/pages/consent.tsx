// app/consent/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { OAuth2ConsentRequest, AcceptOAuth2ConsentRequestSession } from '@ory/hydra-client-fetch'

export default function ConsentPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [consentRequest, setConsentRequest] = useState<OAuth2ConsentRequest | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [csrfToken, setCSRFToken] = useState<string>('')
  const [remember, setRemember] = useState(false)
  const [grantScope, setGrantScope] = useState<string[]>([])

  const consentChallenge = searchParams.get('consent_challenge')

  useEffect(() => {
    if (!consentChallenge) {
      setError('Expected a consent challenge to be set but received none.')
      setLoading(false)
      return
    }

    const fetchConsentRequest = async () => {
      try {
        // Fetch CSRF token
        const csrfResponse = await fetch('/api/csrf')
        const { token } = await csrfResponse.json()
        setCSRFToken(token)

        // Get consent request from API route
        const response = await fetch(
          `/api/consent?consent_challenge=${consentChallenge}`
        )
        
        if (!response.ok) {
          throw new Error('Failed to fetch consent request')
        }

        console.log('Consent request response:', response)
        const data = await response.json()
        console.log('Consent request data:', data)

        // Check if we should redirect (consent was auto-accepted)
        if (data.redirect_to) {
          window.location.href = data.redirect_to
          return
        }

        // Otherwise, show the consent UI
        setConsentRequest(data.consentRequest)
        setGrantScope(data.consentRequest.requested_scope || [])
        setLoading(false)
      } catch (err) {
        console.error('Error fetching consent request:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
        setLoading(false)
      }
    }

    fetchConsentRequest()
  }, [consentChallenge])

  const handleScopeChange = (scope: string, checked: boolean) => {
    if (checked) {
      setGrantScope([...grantScope, scope])
    } else {
      setGrantScope(grantScope.filter(s => s !== scope))
    }
  }

  const handleSubmit = async (action: 'accept' | 'deny') => {
    if (!consentChallenge) return

    try {
      const response = await fetch('/api/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          challenge: consentChallenge,
          action,
          grant_scope: grantScope,
          remember,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit consent')
      }

      const data = await response.json()
      window.location.href = data.redirect_to
    } catch (err) {
      console.error('Error submitting consent:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
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
        <h1 className="text-2xl font-bold mb-6 text-center">
          Authorize Application
        </h1>

        <div className="mb-6">
          <p className="text-gray-700 mb-2">
            <strong>{consentRequest.client?.client_name || consentRequest.client?.client_id}</strong> wants to access your account
          </p>
          <p className="text-sm text-gray-600">
            User: <strong>{consentRequest.subject}</strong>
          </p>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Requested Permissions:</h2>
          <div className="space-y-2">
            {consentRequest.requested_scope?.map((scope) => (
              <label key={scope} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={grantScope.includes(scope)}
                  onChange={(e) => handleScopeChange(scope, e.target.checked)}
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
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Remember my decision for 1 hour
            </span>
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
