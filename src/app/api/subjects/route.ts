import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

const subjectSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  code: z.string().min(2, 'Code must be at least 2 characters')
})

export async function POST(request: Request) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (user.role !== 'TEACHER') {
      return NextResponse.json(
        { error: 'Only teachers can create subjects' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = subjectSchema.parse(body)

    // Check if subject code already exists
    const existingSubject = await prisma.subject.findUnique({
      where: { code: validatedData.code }
    })

    if (existingSubject) {
      return NextResponse.json(
        { error: 'Subject code already exists' },
        { status: 400 }
      )
    }

    const subject = await prisma.subject.create({
      data: {
        ...validatedData,
        teacherId: user.id
      }
    })

    return NextResponse.json(subject, { status: 201 })
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

export async function GET(request: Request) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const teacherId = searchParams.get('teacherId')
    
    const where: any = {}
    
    if (query) {
      where.OR = [
        { title: { contains: query } },
        { code: { contains: query } }
      ]
    }

    if (teacherId) {
      where.teacherId = parseInt(teacherId)
    }

    const subjects = await prisma.subject.findMany({
      where,
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        enrollments: {
          select: {
            studentId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform the data to include enrollment count
    const transformedSubjects = subjects.map(subject => ({
      ...subject,
      enrollmentCount: subject.enrollments.length,
      enrollments: undefined
    }))

    return NextResponse.json(transformedSubjects)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
