import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/db'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string; submissionId: string; fileId: string } }
) {
  try {
    const { taskId, submissionId, fileId } = await params
    const user = await getSession()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const taskIdNum = parseInt(taskId)
    const submissionIdNum = parseInt(submissionId)
    const fileIdNum = parseInt(fileId)

    // Verify access permissions
    let hasAccess = false
    
    if (user.role === 'TEACHER') {
      // Teachers can download files from tasks they own
      const task = await prisma.task.findFirst({
        where: {
          id: taskIdNum,
          teacherId: user.id
        }
      })
      hasAccess = !!task
    } else if (user.role === 'STUDENT') {
      // Students can only download their own files
      const submission = await prisma.submission.findFirst({
        where: {
          id: submissionIdNum,
          studentId: user.id,
          taskId: taskIdNum
        }
      })
      hasAccess = !!submission
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get file information
    const file = await prisma.submissionFile.findFirst({
      where: {
        id: fileIdNum,
        submissionId: submissionIdNum
      }
    })

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Construct file path
    const filePath = join(process.cwd(), 'public', file.filePath)
    
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found on disk' },
        { status: 404 }
      )
    }

    // Read file
    const fileBuffer = await readFile(filePath)

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': file.fileType,
        'Content-Disposition': `attachment; filename="${file.originalName}"`,
        'Content-Length': file.fileSize.toString()
      }
    })
    

  } catch (error) {
    console.error('File download error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
