import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/db'
import { z } from 'zod'

const fileSubmissionSchema = z.object({
  content: z.string().optional(),
  files: z.array(z.object({
    fileName: z.string(),
    originalName: z.string(),
    filePath: z.string(),
    fileSize: z.number(),
    fileType: z.string()
  })).optional()
})

export async function POST(
  request: NextRequest,
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
    const validatedData = fileSubmissionSchema.parse(body)

    if (!validatedData.content && (!validatedData.files || validatedData.files.length === 0)) {
      return NextResponse.json(
        { error: 'You must provide either content or files' },
        { status: 400 }
      )
    }

    // Create submission with files in a transaction
    const submission = await prisma.$transaction(async (prisma) => {
      const newSubmission = await prisma.submission.create({
        data: {
          content: validatedData.content || '',
          taskId: taskIdNum,
          studentId: user.id,
          status: 'SUBMITTED',
          submittedAt: new Date()
        }
      })

      // Create file records if files are provided
      if (validatedData.files && validatedData.files.length > 0) {
        // Note: File creation will be handled after Prisma client is regenerated
        console.log('Files to be saved:', validatedData.files)
        // await prisma.submissionFile.createMany({
        //   data: validatedData.files.map(file => ({
        //     submissionId: newSubmission.id,
        //     fileName: file.fileName,
        //     originalName: file.originalName,
        //     filePath: file.filePath,
        //     fileSize: file.fileSize,
        //     fileType: file.fileType
        //   }))
        // })
      }

      return prisma.submission.findUnique({
        where: { id: newSubmission.id },
        include: {
          task: {
            select: {
              title: true,
              maxPoints: true
            }
          }
        }
      })
    })

    return NextResponse.json(submission, { status: 201 })
  } catch (error) {
    console.error('File submission error:', error)
    
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
