import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Password is set via environment variable
const AUTH_PASSWORD = process.env.ARB_PANEL_PASSWORD || 'changeme'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { password } = body
    
    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }
    
    if (password !== AUTH_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }
    
    // Create auth cookie with timestamp for expiration tracking
    const authData = {
      authenticated: true,
      timestamp: Date.now(),
    }
    
    const cookieStore = await cookies()
    cookieStore.set('arb-auth', JSON.stringify(authData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour in seconds
      path: '/',
    })
    
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

