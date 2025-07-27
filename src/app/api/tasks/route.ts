import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

const taskSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  subjectId: z.number(),
  dueDate: z.string().datetime().optional(),
  maxPoints: z.number().min(0).default(100)
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
        { error: 'Only teachers can create tasks' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = taskSchema.parse(body)

    // Verify that the teacher owns the subject
    const subject = await prisma.subject.findUnique({
      where: { 
        id: validatedData.subjectId,
        teacherId: user.id
      }
    })

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject not found or you do not have permission' },
        { status: 404 }
      )
    }

    const task = await prisma.task.create({
      data: {
        ...validatedData,
        teacherId: user.id
      },
      include: {
        subject: {
          select: {
            title: true,
            code: true
          }
        }
      }
    })

    return NextResponse.json(task, { status: 201 })
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
    const subjectId = searchParams.get('subjectId')
    
    const where: any = {}
    
    if (subjectId) {
      where.subjectId = parseInt(subjectId)
    }

    // Add role-specific filters
    if (user.role === 'TEACHER') {
      where.teacherId = user.id
    } else {
      // For students, only show tasks from enrolled subjects
      where.subject = {
        enrollments: {
          some: {
            studentId: user.id
          }
        }
      }
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        subject: {
          select: {
            title: true,
            code: true
          }
        },
        submissions: user.role === 'STUDENT' ? {
          where: {
            studentId: user.id
          },
          select: {
            status: true,
            pointsEarned: true,
            submittedAt: true
          }
        } : {
          select: {
            status: true
          }
        }
      },
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    // Transform the response based on user role
    const transformedTasks = tasks.map(task => ({
      ...task,
      submission: user.role === 'STUDENT' ? task.submissions[0] || null : undefined,
      submissions: user.role === 'TEACHER' ? {
        total: task.submissions.length,
        pending: task.submissions.filter(s => s.status === 'PENDING').length,
        submitted: task.submissions.filter(s => s.status === 'SUBMITTED').length,
        graded: task.submissions.filter(s => s.status === 'GRADED').length
      } : undefined
    }))

    return NextResponse.json(transformedTasks)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
