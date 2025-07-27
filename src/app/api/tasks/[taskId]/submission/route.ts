import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const taskId = parseInt(params.taskId)

    // Get the task first to check permissions
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        OR: [
          // Teacher owns the task
          { teacherId: user.id },
          // Student is enrolled in the subject
          {
            subject: {
              enrollments: {
                some: {
                  studentId: user.id
                }
              }
            }
          }
        ]
      }
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found or access denied' },
        { status: 404 }
      )
    }

    // For students, only get their own submission
    if (user.role === 'STUDENT') {
      const submission = await prisma.submission.findFirst({
        where: {
          taskId,
          studentId: user.id
        },
        include: {
          files: true,
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

      if (!submission) {
        return NextResponse.json(
          { error: 'Submission not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(submission)
    }

    // For teachers, get all submissions for the task
    if (user.role === 'TEACHER') {
      const submissions = await prisma.submission.findMany({
        where: {
          taskId
        },
        include: {
          files: true,
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
        },
        orderBy: {
          submittedAt: 'desc'
        }
      })

      return NextResponse.json(submissions)
    }

    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    )
  } catch (error) {
    console.error('Get submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
