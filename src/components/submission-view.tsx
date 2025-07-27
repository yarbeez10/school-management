'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  Clock, 
  FileText, 
  Download, 
  Calendar,
  AlertCircle,
  Loader2
} from 'lucide-react'
import Link from 'next/link'

interface SubmissionFile {
  id: number
  fileName: string
  originalName: string
  filePath: string
  fileSize: number
  fileType: string
}

interface Submission {
  id: number
  content?: string
  status: 'PENDING' | 'SUBMITTED' | 'GRADED'
  pointsEarned?: number
  feedback?: string
  submittedAt?: string
  gradedAt?: string
  files: SubmissionFile[]
  task: {
    title: string
    maxPoints: number
  }
  student: {
    name: string
    email: string
  }
}

interface SubmissionViewProps {
  taskId: string
  isTeacher?: boolean
  studentId?: string
}

export default function SubmissionView({ taskId, isTeacher = false, studentId }: SubmissionViewProps) {
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchSubmission() {
      try {
        setLoading(true)
        const url = studentId 
          ? `/api/tasks/${taskId}/submissions/${studentId}`
          : `/api/tasks/${taskId}/submission`
        
        const response = await fetch(url)
        
        if (response.status === 404) {
          // No submission found
          setSubmission(null)
        } else if (response.ok) {
          const data = await response.json()
          setSubmission(data)
        } else {
          const data = await response.json()
          throw new Error(data.error || 'Failed to load submission')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load submission')
      } finally {
        setLoading(false)
      }
    }

    fetchSubmission()
  }, [taskId, studentId])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800'
      case 'GRADED': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getFileTypeIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️'
    if (fileType === 'application/pdf') return '📄'
    if (fileType.includes('word')) return '📝'
    if (fileType === 'text/plain') return '📄'
    if (fileType.includes('zip')) return '📦'
    return '📎'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading submission...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!submission) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            No Submission Yet
          </CardTitle>
          <CardDescription>
            {isTeacher 
              ? 'The student has not submitted this task yet.' 
              : 'You have not submitted this task yet.'
            }
          </CardDescription>
        </CardHeader>
        {!isTeacher && (
          <CardContent>
            <Link href={`/tasks/${taskId}/submit`}>
              <Button>Submit Task</Button>
            </Link>
          </CardContent>
        )}
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Submission Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {submission.status === 'GRADED' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <Clock className="h-5 w-5 text-blue-600" />
            )}
            Submission Status
          </CardTitle>
          <CardDescription>
            {isTeacher && `Submitted by ${submission.student.name}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Badge className={getStatusColor(submission.status)}>
              {submission.status}
            </Badge>
            {submission.submittedAt && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>
                  Submitted: {new Date(submission.submittedAt).toLocaleDateString()} at{' '}
                  {new Date(submission.submittedAt).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>

          {submission.status === 'GRADED' && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Grade:</span>
                <span className="text-lg font-bold text-green-600">
                  {submission.pointsEarned || 0} / {submission.task.maxPoints}
                </span>
              </div>
              {submission.feedback && (
                <div>
                  <span className="font-medium">Feedback:</span>
                  <p className="mt-1 text-gray-700">{submission.feedback}</p>
                </div>
              )}
              {submission.gradedAt && (
                <div className="flex items-center gap-1 text-sm text-gray-600 mt-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Graded: {new Date(submission.gradedAt).toLocaleDateString()} at{' '}
                    {new Date(submission.gradedAt).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Text Content */}
      {submission.content && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Text Submission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap font-sans text-sm">
                {submission.content}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Files */}
      {submission.files && submission.files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Submitted Files ({submission.files.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {submission.files.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded border">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getFileTypeIcon(file.fileType)}</span>
                    <div>
                      <p className="font-medium text-sm">{file.originalName}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.fileSize)} • {file.fileType}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const downloadUrl = `/api/tasks/${taskId}/submissions/${submission.id}/files/${file.id}`
                      window.open(downloadUrl, '_blank')
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions for Students */}
      {!isTeacher && submission.status === 'SUBMITTED' && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Your submission has been received and is waiting to be graded by your teacher.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
