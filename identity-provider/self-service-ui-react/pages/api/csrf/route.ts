// app/api/csrf/route.ts
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

export async function GET() {
  // Generate a CSRF token
  const token = randomBytes(32).toString('hex')
  
  // In production, you should store this token in a session/cookie
  // and validate it on POST requests
  
  return NextResponse.json({ token })
}
