import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/db'
import { z } from 'zod'

const gradeSchema = z.object({
  pointsEarned: z.number().min(0),
  feedback: z.string().optional()
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { taskId: string; submissionId: string } }
) {
  try {
    const { taskId, submissionId } = await params
    const user = await getSession()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (user.role !== 'TEACHER') {
      return NextResponse.json(
        { error: 'Only teachers can grade submissions' },
        { status: 403 }
      )
    }

    const taskIdNum = parseInt(taskId)
    const submissionIdNum = parseInt(submissionId)

    // Check if the teacher owns this task
    const task = await prisma.task.findFirst({
      where: {
        id: taskIdNum,
        teacherId: user.id
      }
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found or you do not have permission' },
        { status: 404 }
      )
    }

    // Check if submission exists and belongs to this task
    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionIdNum,
        taskId: taskIdNum
      }
    })

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = gradeSchema.parse(body)

    // Validate points don't exceed max points
    if (validatedData.pointsEarned > task.maxPoints) {
      return NextResponse.json(
        { error: `Points cannot exceed maximum of ${task.maxPoints}` },
        { status: 400 }
      )
    }

    // Update the submission with grade and feedback
    const updatedSubmission = await prisma.submission.update({
      where: {
        id: submissionIdNum
      },
      data: {
        pointsEarned: validatedData.pointsEarned,
        feedback: validatedData.feedback || null,
        status: 'GRADED',
        gradedAt: new Date()
      },
      include: {
        task: {
          select: {
            title: true,
            maxPoints: true
          }
        },
        student: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(updatedSubmission)
  } catch (error) {
    console.error('Grade submission error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid grade data', details: error.issues },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
