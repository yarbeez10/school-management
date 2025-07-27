import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const submissionSchema = z.object({
  content: z.string().min(1, 'Submission cannot be empty')
})

const taskUpdateSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  maxPoints: z.number().min(0).optional()
})

export async function GET(
  req: Request, 
  { params }: { params: { taskId: string } }
) {
  const { taskId } = await params
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = Number(taskId)
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      subject: { select: { title: true, code: true } }
    }
  })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // Only allow teachers who own or students enrolled to view
  if (user.role === 'TEACHER' && task.teacherId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (user.role === 'STUDENT') {
    const enrolled = await prisma.enrollment.findFirst({ where: { studentId: user.id, subjectId: task.subjectId } })
    if (!enrolled) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.json(task)
}

export async function PUT(
  req: Request, 
  { params }: { params: { taskId: string } }
) {
  const { taskId } = await params
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = Number(taskId)
  const task = await prisma.task.findUnique({ where: { id } })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (user.role !== 'TEACHER' || task.teacherId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const data = taskUpdateSchema.parse(body)
  const updated = await prisma.task.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(
  req: Request, 
  { params }: { params: { taskId: string } }
) {
  const { taskId } = await params
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = Number(taskId)
  const task = await prisma.task.findUnique({ where: { id } })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (user.role !== 'TEACHER' || task.teacherId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await prisma.task.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

export async function POST(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = await params
    const user = await getSession()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (user.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Only students can submit tasks' },
        { status: 403 }
      )
    }

    const taskIdNum = parseInt(taskId)
    
    // Check if task exists and student is enrolled
    const task = await prisma.task.findFirst({
      where: {
        id: taskIdNum,
        subject: {
          enrollments: {
            some: {
              studentId: user.id
            }
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found or you are not enrolled in this subject' },
        { status: 404 }
      )
    }

    // Check if task is past due date
    if (task.dueDate && new Date(task.dueDate) < new Date()) {
      return NextResponse.json(
        { error: 'Task submission deadline has passed' },
        { status: 400 }
      )
    }

    // Check if student has already submitted
    const existingSubmission = await prisma.submission.findFirst({
      where: {
        taskId: taskIdNum,
        studentId: user.id
      }
    })

    if (existingSubmission) {
      return NextResponse.json(
        { error: 'You have already submitted this task' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = submissionSchema.parse(body)

    const submission = await prisma.submission.create({
      data: {
        content: validatedData.content,
        taskId: taskIdNum,
        studentId: user.id,
        status: 'SUBMITTED',
        submittedAt: new Date()
      },
      include: {
        task: {
          select: {
            title: true,
            maxPoints: true
          }
        }
      }
    })

    return NextResponse.json(submission, { status: 201 })
  } catch (error) {
    console.error('Submission error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid submission data', details: error.issues },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
