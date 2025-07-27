import { getSession } from '@/lib/auth'
import prisma from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, FileText, Users, Calendar, Award } from 'lucide-react'
import SubmissionView from '@/components/submission-view'

interface PageProps {
  params: {
    taskId: string
  }
}

export default async function TaskDetailPage({ params }: PageProps) {
  const user = await getSession()
  if (!user) return notFound()
  
  const id = Number(params.taskId)
  const task = await prisma.task.findUnique({
    where: { id },
    include: { 
      subject: { 
        select: {
          title: true,
          code: true,
          teacher: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }, 
      submissions: {
        select: {
          id: true,
          status: true,
          pointsEarned: true,
          submittedAt: true,
          studentId: true,
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
      }
    }
  })
  
  if (!task) return notFound()
  
  // Only allow teachers who own or students enrolled to view
  if (user.role === 'TEACHER' && task.teacherId !== user.id) return notFound()
  if (user.role === 'STUDENT') {
    const enrolled = await prisma.enrollment.findFirst({ 
      where: { studentId: user.id, subjectId: task.subjectId } 
    })
    if (!enrolled) return notFound()
  }
  
  const userSubmission = user.role === 'STUDENT' 
    ? task.submissions.find(s => s.studentId === user.id)
    : null

  const submittedCount = task.submissions.filter(s => s.status === 'SUBMITTED' || s.status === 'GRADED').length
  const gradedCount = task.submissions.filter(s => s.status === 'GRADED').length
  const averageGrade = gradedCount > 0 
    ? task.submissions
        .filter(s => s.status === 'GRADED' && s.pointsEarned !== null)
        .reduce((sum, s) => sum + (s.pointsEarned || 0), 0) / gradedCount
    : 0

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()
  const canSubmit = user.role === 'STUDENT' && !userSubmission && !isOverdue

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <div className="mb-6">
        <Link href="/tasks">
          <Button variant="ghost" className="mb-4">
            ← Back to Tasks
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Details */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl mb-2">{task.title}</CardTitle>
                  <CardDescription className="text-lg">
                    {task.subject.code} - {task.subject.title}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline" className="text-sm">
                    <Award className="h-3 w-3 mr-1" />
                    {task.maxPoints} points
                  </Badge>
                  {task.dueDate && (
                    <Badge variant={isOverdue ? "destructive" : "secondary"} className="text-sm">
                      <Clock className="h-3 w-3 mr-1" />
                      {isOverdue ? 'Overdue' : 'Active'}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {task.description && (
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="whitespace-pre-wrap">{task.description}</p>
                  </div>
                </div>
              )}
              
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Created: {new Date(task.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {task.dueDate && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                      Due: {new Date(task.dueDate).toLocaleDateString()} at{' '}
                      {new Date(task.dueDate).toLocaleTimeString()}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>Teacher: {task.subject.teacher.name}</span>
                </div>
              </div>

              {/* Action Buttons for Students */}
              {user.role === 'STUDENT' && (
                <div className="flex gap-3 pt-4 border-t">
                  {canSubmit && (
                    <Link href={`/tasks/${task.id}/submit`}>
                      <Button>
                        <FileText className="h-4 w-4 mr-2" />
                        Submit Task
                      </Button>
                    </Link>
                  )}
                  {userSubmission && (
                    <Badge variant="outline" className="px-3 py-1">
                      Status: {userSubmission.status}
                      {userSubmission.status === 'GRADED' && userSubmission.pointsEarned !== null && (
                        <span className="ml-2 font-medium">
                          {userSubmission.pointsEarned}/{task.maxPoints}
                        </span>
                      )}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submission Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">
              {user.role === 'TEACHER' ? 'All Submissions' : 'Your Submission'}
            </h2>
            <SubmissionView 
              taskId={params.taskId} 
              isTeacher={user.role === 'TEACHER'} 
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats for Teachers */}
          {user.role === 'TEACHER' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Submission Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{submittedCount}</div>
                    <div className="text-sm text-gray-600">Submitted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{gradedCount}</div>
                    <div className="text-sm text-gray-600">Graded</div>
                  </div>
                </div>
                {averageGrade > 0 && (
                  <div className="text-center pt-2 border-t">
                    <div className="text-lg font-semibold">
                      {averageGrade.toFixed(1)} / {task.maxPoints}
                    </div>
                    <div className="text-sm text-gray-600">Average Grade</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/subjects/${task.subjectId}`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  View Subject
                </Button>
              </Link>
              {user.role === 'TEACHER' && (
                <>
                  <Link href={`/tasks/${task.id}/edit`} className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Edit Task
                    </Button>
                  </Link>
                  <Link href={`/tasks/${task.id}/submissions`} className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="h-4 w-4 mr-2" />
                      Manage Submissions
                    </Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>

          {/* Recent Submissions (for teachers) */}
          {user.role === 'TEACHER' && task.submissions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {task.submissions.slice(0, 5).map((submission) => (
                    <div key={submission.id} className="flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium">{submission.student.name}</div>
                        <div className="text-gray-500">
                          {submission.submittedAt 
                            ? new Date(submission.submittedAt).toLocaleDateString()
                            : 'Not submitted'
                          }
                        </div>
                      </div>
                      <Badge 
                        variant={submission.status === 'GRADED' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {submission.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
