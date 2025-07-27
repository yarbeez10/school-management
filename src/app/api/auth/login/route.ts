import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { verifyPassword, setSession } from '@/lib/auth'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = loginSchema.parse(body)

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await verifyPassword(
      validatedData.password,
      user.password
    )

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Create session
    const { password: _, ...userWithoutPassword } = user
    const cookieResponse = await setSession({ user: userWithoutPassword })

    // Create a new Response with the cookie header
    const response = NextResponse.json({ user: userWithoutPassword })
    response.headers.set('Set-Cookie', cookieResponse.headers.get('Set-Cookie') || '')
    
    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
