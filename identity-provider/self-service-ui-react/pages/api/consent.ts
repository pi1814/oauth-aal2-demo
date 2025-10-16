import { NextRequest, NextResponse } from 'next/server'
import ory from "../../pkg/sdk";
import { AcceptOAuth2ConsentRequestSession } from '@ory/hydra-client-fetch'
import { oidcConformityMaybeFakeSession } from '../../pkg/stub/oidc-cert'
export const runtime = 'edge'


export default async function handler(
  req: NextRequest,
  res: NextResponse
) {
  if (req.method === 'GET') {
    return GET(req)
  }

  if (req.method === 'POST') {
    return POST(req)
  }

  return NextResponse.json(
      { error: `Method ${req.method} Not Allowed`},
      { status: 405 }
    )
}

// GET handler - Fetch consent request
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const challenge = searchParams.get('consent_challenge')

    if (!challenge) {
      return NextResponse.json(
        { error: 'Expected a consent challenge to be set but received none.' },
        { status: 400 }
      )
    }

    // Get consent request from Hydra
    const consentRequest = await ory.oauth2.getOAuth2ConsentRequest({
      consentChallenge: challenge,
    })

    // Check if consent can be skipped
    if (consentRequest.data.skip || (consentRequest.data.client as any)?.skip_consent) {
      // Auto-accept consent
      const acceptResponse = await ory.oauth2.acceptOAuth2ConsentRequest({
        consentChallenge: challenge,
        acceptOAuth2ConsentRequest: {
          grant_scope: consentRequest.data.requested_scope,
          grant_access_token_audience: consentRequest.data.requested_access_token_audience,
          session: {
            access_token: {},
            id_token: {},
          },
        },
      })

      return NextResponse.json({
        redirect_to: acceptResponse.data.redirect_to,
      })
    }

    // Return consent request for UI
    return NextResponse.json({
      consentRequest,
    })
  } catch (error) {
    console.error('Error in GET /api/consent:', error)
    return NextResponse.json(
      { error: 'Failed to process consent request' },
      { status: 500 }
    )
  }
}

// POST handler - Accept or reject consent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { challenge, action, grant_scope, remember } = body

    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge is required' },
        { status: 400 }
      )
    }

    // Handle denial
    if (action === 'deny') {
      const rejectResponse = await ory.oauth2.rejectOAuth2ConsentRequest({
        consentChallenge: challenge,
        rejectOAuth2Request: {
          error: 'access_denied',
          error_description: 'The resource owner denied the request',
        },
      })

      return NextResponse.json({
        redirect_to: rejectResponse.data.redirect_to,
      })
    }

    // Handle acceptance
    let grantScope = grant_scope
    if (!Array.isArray(grantScope)) {
      grantScope = [grantScope]
    }

    // Create session data
    let session: AcceptOAuth2ConsentRequestSession = {
      access_token: {},
      id_token: {},
    }

    // You can add custom claims here based on granted scopes
    // Example:
    // if (grantScope.includes('profile')) {
    //   session.id_token.family_name = 'Doe'
    //   session.id_token.given_name = 'John'
    // }

    // Fetch consent request to get audience info
    const consentRequest = await ory.oauth2.getOAuth2ConsentRequest({
      consentChallenge: challenge,
    })

    // Accept consent request
    const acceptResponse = await ory.oauth2.acceptOAuth2ConsentRequest({
      consentChallenge: challenge,
      acceptOAuth2ConsentRequest: {
        grant_scope: grantScope,
        session: oidcConformityMaybeFakeSession(
          grantScope,
          session,
        ),
        grant_access_token_audience: consentRequest.data.requested_access_token_audience,
        remember: Boolean(remember),
        remember_for: 3600,
      },
    })

    return NextResponse.json({
      redirect_to: acceptResponse.data.redirect_to,
    })
  } catch (error) {
    console.error('Error in POST /api/consent:', error)
    return NextResponse.json(
      { error: 'Failed to process consent' },
      { status: 500 }
    )
  }
}
