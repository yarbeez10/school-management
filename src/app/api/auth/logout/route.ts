import { NextResponse } from 'next/server'
import { clearSession } from '@/lib/auth'

export async function POST() {
  const cookieResponse = await clearSession()
  const response = NextResponse.json({ success: true })
  response.headers.set('Set-Cookie', cookieResponse.headers.get('Set-Cookie') || '')
  return response
}
