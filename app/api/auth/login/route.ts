import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Use the same backend URL as the proxy route (server-side env vars don't use NEXT_PUBLIC_)
const API_BASE_URL = process.env.BACKEND_URL || 'https://arb-production-8438.up.railway.app'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body
    
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }
    
    // Call backend auth API
    const backendResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    
    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.detail || 'Invalid username or password' },
        { status: 401 }
      )
    }
    
    const data = await backendResponse.json()
    
    // Create auth cookie with user info and JWT token
    const authData = {
      authenticated: true,
      timestamp: Date.now(),
      user: data.user,
      token: data.access_token,
    }
    
    const cookieStore = await cookies()
    cookieStore.set('arb-auth', JSON.stringify(authData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 4, // 4 hours in seconds
      path: '/',
    })
    
    return NextResponse.json({ 
      success: true,
      user: data.user,
    })
  } catch (e) {
    console.error('Login error:', e)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

