'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  GraduationCap,
  Download
} from 'lucide-react'
import Link from 'next/link'
import GradingForm from '@/components/grading-form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

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

interface SubmissionsPageProps {
  params: {
    taskId: string
  }
}

export default function TaskSubmissionsPage({ params }: SubmissionsPageProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)

  useEffect(() => {
    async function loadSubmissions() {
      try {
        setLoading(true)
        const response = await fetch(`/api/tasks/${params.taskId}/submissions`)
        
        if (response.ok) {
          const data = await response.json()
          setSubmissions(data.submissions || [])
        } else {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to load submissions')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load submissions')
      } finally {
        setLoading(false)
      }
    }
    
    loadSubmissions()
  }, [params.taskId])

  const fetchSubmissions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/tasks/${params.taskId}/submissions`)
      
      if (response.ok) {
        const data = await response.json()
        setSubmissions(data.submissions || [])
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load submissions')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submissions')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800'
      case 'GRADED': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const submittedCount = submissions.filter(s => s.status === 'SUBMITTED' || s.status === 'GRADED').length
  const gradedCount = submissions.filter(s => s.status === 'GRADED').length
  const averageGrade = gradedCount > 0 
    ? submissions
        .filter(s => s.status === 'GRADED' && s.pointsEarned !== null)
        .reduce((sum, s) => sum + (s.pointsEarned || 0), 0) / gradedCount
    : 0

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading submissions...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <div className="mb-6">
        <Link href={`/tasks/${params.taskId}`}>
          <Button variant="ghost" className="mb-4">
            ← Back to Task
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Manage Submissions</h1>
        <p className="text-gray-600 mt-2">
          {submissions.length > 0 && submissions[0].task.title}
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-2xl font-bold">{submissions.length}</p>
                <p className="text-xs text-gray-600">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <FileText className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-2xl font-bold">{submittedCount}</p>
                <p className="text-xs text-gray-600">Submitted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-purple-600" />
              <div className="ml-2">
                <p className="text-2xl font-bold">{gradedCount}</p>
                <p className="text-xs text-gray-600">Graded</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <GraduationCap className="h-4 w-4 text-orange-600" />
              <div className="ml-2">
                <p className="text-2xl font-bold">
                  {averageGrade > 0 ? averageGrade.toFixed(1) : '—'}
                </p>
                <p className="text-xs text-gray-600">Avg Grade</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submissions List */}
      <div className="space-y-4">
        {submissions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No submissions yet</h3>
              <p className="text-gray-600">Students haven&apos;t submitted their work for this task.</p>
            </CardContent>
          </Card>
        ) : (
          submissions.map((submission) => (
            <Card key={submission.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{submission.student.name}</CardTitle>
                    <CardDescription>{submission.student.email}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(submission.status)}>
                      {submission.status}
                    </Badge>
                    {submission.status === 'GRADED' && submission.pointsEarned !== null && (
                      <Badge variant="outline">
                        {submission.pointsEarned}/{submission.task.maxPoints}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {submission.submittedAt && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>
                      Submitted: {new Date(submission.submittedAt).toLocaleDateString()} at{' '}
                      {new Date(submission.submittedAt).toLocaleTimeString()}
                    </span>
                  </div>
                )}

                {/* Content Preview */}
                {submission.content && (
                  <div>
                    <h4 className="font-medium mb-2">Text Submission:</h4>
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      <p className="line-clamp-3">
                        {submission.content.length > 200 
                          ? `${submission.content.substring(0, 200)}...` 
                          : submission.content
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Files */}
                {submission.files && submission.files.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Files ({submission.files.length}):</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {submission.files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4" />
                            <span className="truncate">{file.originalName}</span>
                            <span className="text-xs text-gray-500">
                              ({formatFileSize(file.fileSize)})
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a href={file.filePath} download={file.originalName} target="_blank" rel="noopener noreferrer">
                              <Download className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feedback if graded */}
                {submission.status === 'GRADED' && submission.feedback && (
                  <div>
                    <h4 className="font-medium mb-2">Feedback:</h4>
                    <div className="bg-green-50 p-3 rounded text-sm border border-green-200">
                      <p>{submission.feedback}</p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline"
                        onClick={() => setSelectedSubmission(submission)}
                      >
                        <GraduationCap className="h-4 w-4 mr-2" />
                        {submission.status === 'GRADED' ? 'Update Grade' : 'Grade'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Grade Submission</DialogTitle>
                        <DialogDescription>
                          Review and grade the submission by {submission.student.name}
                        </DialogDescription>
                      </DialogHeader>
                      {selectedSubmission && (
                        <GradingForm 
                          submission={selectedSubmission}
                          taskId={params.taskId}
                          onGradeSubmitted={() => {
                            fetchSubmissions()
                            setSelectedSubmission(null)
                          }}
                        />
                      )}
                    </DialogContent>
                  </Dialog>

                  <Button variant="ghost" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
