'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { useState, useEffect } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, Loader2, Clock, FileText } from 'lucide-react'
import FileUpload from '@/components/file-upload'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const submissionSchema = z.object({
  content: z.string().optional()
})

interface UploadedFile {
  fileName: string
  originalName: string
  filePath: string
  fileSize: number
  fileType: string
}

interface Task {
  id: number
  title: string
  description?: string
  dueDate?: string
  maxPoints: number
  subject: {
    title: string
    code: string
  }
}

export default function SubmitTaskForm({ params }: { params: { taskId: string } }) {
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const form = useForm<z.infer<typeof submissionSchema>>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      content: ''
    }
  })

  // Fetch task details
  useEffect(() => {
    async function fetchTask() {
      try {
        const response = await fetch(`/api/tasks/${params.taskId}`)
        if (response.ok) {
          const taskData = await response.json()
          setTask(taskData)
        } else {
          setError('Failed to load task details')
        }
      } catch {
        setError('Failed to load task details')
      } finally {
        setLoading(false)
      }
    }

    fetchTask()
  }, [params.taskId])

  const handleFilesUploaded = (files: UploadedFile[]) => {
    setUploadedFiles(files)
  }

  async function onSubmit(values: z.infer<typeof submissionSchema>) {
    try {
      setIsSubmitting(true)
      setError('')

      // Check if we have content or files
      if (!values.content && uploadedFiles.length === 0) {
        setError('You must provide either text content or upload files')
        return
      }

      let endpoint = `/api/tasks/${params.taskId}`
      let payload: { content?: string; files?: UploadedFile[] } = { content: values.content }

      // If we have files, use the file submission endpoint
      if (uploadedFiles.length > 0) {
        endpoint = `/api/tasks/${params.taskId}/submit-files`
        payload = {
          content: values.content || '',
          files: uploadedFiles
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit task')
      }

      router.push(`/tasks`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }


  }

  if (loading) {
    return (
      <div className="container max-w-2xl mx-auto py-10">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading task details...</span>
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="container max-w-2xl mx-auto py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Task not found or you don&apos;t have permission to view it.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()

  return (
    <div className="container max-w-4xl mx-auto py-10">
      <div className="mb-6">
        <Link href={`/tasks/${params.taskId}`}>
          <Button variant="ghost" className="mb-4">
            ← Back to Task
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Submit Task</h1>
      </div>

      {/* Task Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {task.title}
          </CardTitle>
          <CardDescription>
            {task.subject.code} - {task.subject.title}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {task.description && (
            <p className="text-gray-700 mb-4">{task.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {task.dueDate && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                  Due: {new Date(task.dueDate).toLocaleDateString()} at {new Date(task.dueDate).toLocaleTimeString()}
                  {isOverdue && ' (Overdue)'}
                </span>
              </div>
            )}
            <span>Max Points: {task.maxPoints}</span>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isOverdue && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Task Overdue</AlertTitle>
          <AlertDescription>
            This task is past its due date. You may not be able to submit it.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Text Submission */}
        <Card>
          <CardHeader>
            <CardTitle>Text Submission</CardTitle>
            <CardDescription>
              Enter your response directly in the text area below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Response</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter your task submission here..."
                          className="min-h-[200px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-4">
                  <Button 
                    variant="outline" 
                    type="button"
                    asChild
                  >
                    <Link href={`/tasks/${params.taskId}`}>Cancel</Link>
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || !!isOverdue}
                  >
                    {isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Submit Task
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>File Submission</CardTitle>
            <CardDescription>
              Upload files as part of your submission (optional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload 
              taskId={params.taskId}
              onFilesUploaded={handleFilesUploaded}
              maxFiles={5}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
