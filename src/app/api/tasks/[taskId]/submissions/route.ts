import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(
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

    const taskIdNum = parseInt(taskId)

    // Verify task exists and user has access
    const task = await prisma.task.findFirst({
      where: {
        id: taskIdNum,
        OR: [
          // Teachers can view all submissions for their tasks
          { teacherId: user.id },
          // Students can only view submissions for tasks they're enrolled in
          {
            subject: {
              enrollments: {
                some: { studentId: user.id }
              }
            }
          }
        ]
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

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found or access denied' },
        { status: 404 }
      )
    }

    let submissions
    
    if (user.role === 'TEACHER') {
      // Teachers can see all submissions
      submissions = await prisma.submission.findMany({
        where: { taskId: taskIdNum },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { submittedAt: 'desc' }
      })
    } else {
      // Students can only see their own submission
      submissions = await prisma.submission.findMany({
        where: { 
          taskId: taskIdNum,
          studentId: user.id 
        }
      })
    }

    return NextResponse.json({
      task,
      submissions
    })
  } catch (error) {
    console.error('Error fetching submissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
