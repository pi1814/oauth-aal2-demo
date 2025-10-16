// app/api/csrf/route.ts
export const runtime = 'edge'

/**
 * Generate a hex string token using Web Crypto.
 */
function generateCSRFToken(): string {
  // Create a Uint8Array of 32 random bytes
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  // Convert to hex representation
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

export default async function GET(request: Request) {
  const csrfToken = generateCSRFToken()
  return new Response(
    JSON.stringify({ csrfToken }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `csrf=${csrfToken}; Path=/; HttpOnly; Secure; SameSite=Strict`
      }
    }
  )
}
