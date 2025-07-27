'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Subject {
  id: number
  title: string
  code: string
  description: string | null
  enrollments: Array<{ id: number, studentId: number }>
  _count: {
    enrollments: number
    tasks: number
  }
  teacher?: {
    name: string
  }
}

interface Props {
  subjects: Subject[]
  isTeacher: boolean
}

export function SubjectsList({ subjects, isTeacher }: Props) {
  const router = useRouter()

  async function handleEnrollment(subjectId: number, isEnrolled: boolean) {
    try {
      const response = await fetch(`/api/subjects/${subjectId}/enroll`, {
        method: isEnrolled ? 'DELETE' : 'POST'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update enrollment')
      }

      router.refresh()
    } catch (error) {
      console.error('Failed to update enrollment:', error)
      // You could add toast notifications here
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {subjects.map((subject) => (
        <Card key={subject.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">{subject.title}</CardTitle>
                <p className="text-sm text-muted-foreground">Code: {subject.code}</p>
                {!isTeacher && subject.teacher && (
                  <p className="text-sm text-muted-foreground">
                    Teacher: {subject.teacher.name}
                  </p>
                )}
              </div>
              {!isTeacher && (
                <Button
                  variant={subject.enrollments.length > 0 ? 'destructive' : 'default'}
                  size="sm"
                  onClick={() =>
                    handleEnrollment(subject.id, subject.enrollments.length > 0)
                  }
                >
                  {subject.enrollments.length > 0 ? 'Unenroll' : 'Enroll'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {subject.description || 'No description provided'}
            </div>
            <div className="mt-4 flex justify-between text-sm text-muted-foreground">
              <div>Students: {subject._count.enrollments}</div>
              <div>Tasks: {subject._count.tasks}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
