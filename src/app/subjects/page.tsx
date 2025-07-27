import { getSession } from '@/lib/auth'
import { CreateSubjectDialog } from '@/components/create-subject-dialog'
import { SubjectsList } from '@/components/subjects-list'
import prisma from '@/lib/db'

export default async function SubjectsPage() {
  const user = await getSession()

  if (!user) {
    return null // Layout will handle redirect
  }

  // Fetch subjects based on user role
  let subjects
  if (user.role === 'TEACHER') {
    subjects = await prisma.subject.findMany({
      where: { teacherId: user.id },
      include: {
        _count: {
          select: {
            enrollments: true,
            tasks: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  } else {
    subjects = await prisma.subject.findMany({
      where: {
        OR: [
          {
            enrollments: {
              some: { studentId: user.id }
            }
          },
          {
            enrollments: {
              none: {}
            }
          }
        ]
      },
      include: {
        teacher: {
          select: {
            name: true
          }
        },
        enrollments: {
          where: {
            studentId: user.id
          }
        },
        _count: {
          select: {
            enrollments: true,
            tasks: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
          <p className="text-muted-foreground">
            {user.role === 'TEACHER'
              ? 'Manage your subjects'
              : 'Browse and enroll in subjects'}
          </p>
        </div>
        {user.role === 'TEACHER' && <CreateSubjectDialog />}
      </div>
      <SubjectsList subjects={subjects} isTeacher={user.role === 'TEACHER'} />
    </div>
  )
}
