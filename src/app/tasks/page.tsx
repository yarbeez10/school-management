import { getSession } from '@/lib/auth'
import prisma from '@/lib/db'
import { redirect } from 'next/navigation'
import { CreateTaskDialog } from '@/components/create-task-dialog'
import { TaskList } from '@/components/task-list'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Clock, CheckCircle, AlertCircle } from 'lucide-react'

export default async function TasksPage() {
  const user = await getSession()
  
  if (!user) {
    redirect('/login')
  }

  const where = user.role === 'TEACHER' 
    ? { teacherId: user.id }
    : {
        subject: {
          enrollments: {
            some: {
              studentId: user.id
            }
          }
        }
      }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      subject: {
        select: {
          title: true,
          code: true
        }
      },
      submissions: user.role === 'STUDENT' ? {
        where: {
          studentId: user.id
        },
        select: {
          status: true,
          pointsEarned: true,
          submittedAt: true
        }
      } : {
        select: {
          status: true
        }
      }
    },
    orderBy: [
      { dueDate: 'asc' },
      { createdAt: 'desc' }
    ]
  })

  // Transform tasks for the component
  const transformedTasks = tasks.map(task => ({
    ...task,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    submission: user.role === 'STUDENT' ? task.submissions[0] || null : undefined,
    submissions: user.role === 'TEACHER' ? {
      total: task.submissions.length,
      pending: task.submissions.filter(s => s.status === 'PENDING').length,
      submitted: task.submissions.filter(s => s.status === 'SUBMITTED').length,
      graded: task.submissions.filter(s => s.status === 'GRADED').length
    } : undefined
  }))

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Tasks</h1>
        {user.role === 'TEACHER' && <CreateTaskDialog subjectId={1} />}
      </div>
      
      {user.role === 'STUDENT' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{transformedTasks.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {transformedTasks.filter(t => !t.submission || t.submission.status === 'PENDING').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Submitted</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {transformedTasks.filter(t => t.submission?.status === 'SUBMITTED' || t.submission?.status === 'GRADED').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {transformedTasks.filter(t => {
                  const isOverdue = t.dueDate && new Date(t.dueDate) < new Date()
                  const notSubmitted = !t.submission || t.submission.status === 'PENDING'
                  return isOverdue && notSubmitted
                }).length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <TaskList tasks={transformedTasks} userRole={user.role} />
    </div>
  )
}
