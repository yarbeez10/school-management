import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

interface Params {
  subjectId: string
}

export async function POST(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (user.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Only students can enroll in subjects' },
        { status: 403 }
      )
    }

    const subject = await prisma.subject.findUnique({
      where: { id: parseInt(params.subjectId) },
      include: {
        enrollments: {
          where: { studentId: user.id }
        }
      }
    })

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      )
    }

    if (subject.enrollments.length > 0) {
      return NextResponse.json(
        { error: 'Already enrolled in this subject' },
        { status: 400 }
      )
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: user.id,
        subjectId: parseInt(params.subjectId)
      },
      include: {
        subject: true,
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(enrollment, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        subjectId: parseInt(params.subjectId),
        studentId: user.id
      }
    })

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Not enrolled in this subject' },
        { status: 404 }
      )
    }

    await prisma.enrollment.delete({
      where: { id: enrollment.id }
    })

    return new Response(null, { status: 204 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
