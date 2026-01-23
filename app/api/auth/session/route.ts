import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('arb-auth')
    
    if (!authCookie) {
      return NextResponse.json({ authenticated: false, user: null })
    }
    
    const authData = JSON.parse(authCookie.value)
    
    // Check if session is expired (4 hours)
    const fourHoursMs = 4 * 60 * 60 * 1000
    if (Date.now() - authData.timestamp > fourHoursMs) {
      return NextResponse.json({ authenticated: false, user: null, expired: true })
    }
    
    return NextResponse.json({
      authenticated: true,
      user: authData.user,
      token: authData.token,
    })
  } catch (e) {
    return NextResponse.json({ authenticated: false, user: null })
  }
}








