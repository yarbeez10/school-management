import { compare, hash } from 'bcryptjs'
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { cookies } from 'next/headers'
import { AuthPayload, User } from './types'

const SECRET_KEY = process.env.JWT_SECRET_KEY || 'your-secret-key'
const key = new TextEncoder().encode(SECRET_KEY)

const convertToJWTPayload = (payload: AuthPayload): JWTPayload & AuthPayload => ({
  ...payload,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60 // 24 hours
})

export async function hashPassword(password: string) {
  return hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return compare(password, hashedPassword)
}

export async function createToken(payload: AuthPayload) {
  const jwtPayload = convertToJWTPayload(payload)
  return new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(key)
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key)
    return payload as unknown as AuthPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<User | null> {
  try {
    const cookiesList = await cookies()
    const token = cookiesList.has('token') ? cookiesList.get('token')?.value : null

    if (!token) return null

    const payload = await verifyToken(token)
    return payload?.user || null
  } catch {
    return null
  }
}

export async function setSession(payload: AuthPayload): Promise<Response> {
  const token = await createToken(payload)
  return new Response(null, {
    status: 200,
    headers: {
      'Set-Cookie': `token=${token}; Path=/; HttpOnly; SameSite=Lax; ${
        process.env.NODE_ENV === 'production' ? 'Secure; ' : ''
      }Max-Age=${60 * 60 * 24}`
    }
  })
}

export async function clearSession(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      'Set-Cookie': 'token=; Path=/; HttpOnly; Max-Age=0'
    }
  })
}
