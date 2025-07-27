import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

interface Params {
  subjectId: string
}

export async function GET(
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

    const subject = await prisma.subject.findUnique({
      where: { id: parseInt(params.subjectId) },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        enrollments: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        tasks: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(subject)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    const subject = await prisma.subject.findUnique({
      where: { id: parseInt(params.subjectId) }
    })

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      )
    }

    if (subject.teacherId !== user.id) {
      return NextResponse.json(
        { error: 'Only the subject teacher can update it' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const updatedSubject = await prisma.subject.update({
      where: { id: parseInt(params.subjectId) },
      data: {
        title: body.title,
        description: body.description
      }
    })

    return NextResponse.json(updatedSubject)
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

    const subject = await prisma.subject.findUnique({
      where: { id: parseInt(params.subjectId) }
    })

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      )
    }

    if (subject.teacherId !== user.id) {
      return NextResponse.json(
        { error: 'Only the subject teacher can delete it' },
        { status: 403 }
      )
    }

    await prisma.subject.delete({
      where: { id: parseInt(params.subjectId) }
    })

    return new Response(null, { status: 204 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
