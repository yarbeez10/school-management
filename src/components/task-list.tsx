'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import Link from 'next/link'
import { FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface Submission {
  status: 'PENDING' | 'SUBMITTED' | 'GRADED'
  pointsEarned?: number
  submittedAt?: string
}

interface Task {
  id: number
  title: string
  description: string | null
  dueDate: string | null
  maxPoints: number
  subject: {
    title: string
    code: string
  }
  submission?: Submission | null
  submissions?: {
    total: number
    pending: number
    submitted: number
    graded: number
  }
}

interface Props {
  tasks: Task[]
  userRole?: 'STUDENT' | 'TEACHER'
}

export function TaskList({ tasks, userRole }: Props) {
  const getStatusBadge = (task: Task) => {
    if (!task.submission) {
      const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()
      return (
        <Badge variant={isOverdue ? "destructive" : "secondary"}>
          {isOverdue ? "Overdue" : "Not Submitted"}
        </Badge>
      )
    }

    switch (task.submission.status) {
      case 'PENDING':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case 'SUBMITTED':
        return <Badge variant="default"><FileText className="w-3 h-3 mr-1" />Submitted</Badge>
      case 'GRADED':
        return <Badge variant="outline"><CheckCircle className="w-3 h-3 mr-1" />Graded</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const canSubmit = (task: Task) => {
    if (userRole !== 'STUDENT') return false
    if (task.submission?.status === 'SUBMITTED' || task.submission?.status === 'GRADED') return false
    if (task.dueDate && new Date(task.dueDate) < new Date()) return false
    return true
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Subject</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Points</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Grade</TableHead>
          {userRole === 'STUDENT' && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TableRow key={task.id}>
            <TableCell>
              <Link href={`/tasks/${task.id}`} className="font-medium hover:underline">
                {task.title}
              </Link>
            </TableCell>
            <TableCell>{task.subject.title} ({task.subject.code})</TableCell>
            <TableCell>
              {task.dueDate ? format(new Date(task.dueDate), 'PPP') : 'No due date'}
            </TableCell>
            <TableCell>{task.maxPoints}</TableCell>
            <TableCell>
              {userRole === 'STUDENT' ? (
                getStatusBadge(task)
              ) : (
                task.submissions ? `${task.submissions.submitted}/${task.submissions.total} submitted` : 'N/A'
              )}
            </TableCell>
            <TableCell>
              {task.submission?.pointsEarned !== undefined 
                ? `${task.submission.pointsEarned}/${task.maxPoints}`
                : '-'}
            </TableCell>
            {userRole === 'STUDENT' && (
              <TableCell>
                {canSubmit(task) ? (
                  <Button asChild size="sm">
                    <Link href={`/tasks/${task.id}/submit`}>
                      Submit
                    </Link>
                  </Button>
                ) : task.submission?.status === 'SUBMITTED' || task.submission?.status === 'GRADED' ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/tasks/${task.id}`}>
                      View
                    </Link>
                  </Button>
                ) : (
                  <Badge variant="destructive">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Overdue
                  </Badge>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
        {tasks.length === 0 && (
          <TableRow>
            <TableCell colSpan={userRole === 'STUDENT' ? 7 : 6} className="text-center">
              No tasks found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
