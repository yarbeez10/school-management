import { getSession } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import prisma from '@/lib/db'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const user = await getSession()
  
  if (!user) {
    redirect('/login')
  }

  let stats
  if (user.role === 'TEACHER') {
    const subjects = await prisma.subject.count({
      where: { teacherId: user.id },
    })
    const tasks = await prisma.task.count({
      where: { teacherId: user.id },
    })
    const pendingSubmissions = await prisma.submission.count({
      where: {
        task: { teacherId: user.id },
        status: 'PENDING',
      },
    })
    stats = [
      { label: 'Subjects', value: subjects },
      { label: 'Tasks Created', value: tasks },
      { label: 'Pending Submissions', value: pendingSubmissions },
    ]
  } else {
    const enrollments = await prisma.enrollment.count({
      where: { studentId: user.id },
    })
    const tasks = await prisma.task.count({
      where: {
        subject: {
          enrollments: {
            some: { studentId: user.id },
          },
        },
      },
    })
    const submissions = await prisma.submission.count({
      where: { studentId: user.id },
    })
    stats = [
      { label: 'Enrolled Subjects', value: enrollments },
      { label: 'Assigned Tasks', value: tasks },
      { label: 'Submissions', value: submissions },
    ]
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.name}!
        </p>
      </div>
      <Separator />
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
