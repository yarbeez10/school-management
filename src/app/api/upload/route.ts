import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed'
]

export async function POST(request: NextRequest) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const taskId = formData.get('taskId') as string

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      )
    }

    // Validate files
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File ${file.name} is too large. Maximum size is 10MB.` },
          { status: 400 }
        )
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `File type ${file.type} is not allowed.` },
          { status: 400 }
        )
      }
    }

    // Create upload directory
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'submissions', taskId, user.id.toString())
    
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Save files and return file info
    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        
        // Generate unique filename
        const timestamp = Date.now()
        const randomSuffix = Math.random().toString(36).substring(2)
        const fileExtension = file.name.split('.').pop()
        const fileName = `${timestamp}-${randomSuffix}.${fileExtension}`
        
        const filePath = join(uploadDir, fileName)
        await writeFile(filePath, buffer)
        
        return {
          fileName,
          originalName: file.name,
          filePath: `/uploads/submissions/${taskId}/${user.id}/${fileName}`,
          fileSize: file.size,
          fileType: file.type
        }
      })
    )

    return NextResponse.json({ 
      success: true, 
      files: uploadedFiles 
    })

  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    )
  }
}
