'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { GraduationCap, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

const gradeSchema = z.object({
  pointsEarned: z.number().min(0, 'Points must be at least 0'),
  feedback: z.string().optional()
})

interface GradingFormProps {
  submission: {
    id: number
    pointsEarned?: number
    feedback?: string
    status: string
    task: {
      maxPoints: number
    }
    student: {
      name: string
    }
  }
  taskId: string
  onGradeSubmitted?: () => void
}

export default function GradingForm({ submission, taskId, onGradeSubmitted }: GradingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const form = useForm<z.infer<typeof gradeSchema>>({
    resolver: zodResolver(gradeSchema),
    defaultValues: {
      pointsEarned: submission.pointsEarned || 0,
      feedback: submission.feedback || ''
    }
  })

  async function onSubmit(values: z.infer<typeof gradeSchema>) {
    try {
      setIsSubmitting(true)
      setError('')
      setSuccess('')

      const response = await fetch(`/api/tasks/${taskId}/submissions/${submission.id}/grade`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to grade submission')
      }

      setSuccess('Submission graded successfully!')
      if (onGradeSubmitted) {
        onGradeSubmitted()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isAlreadyGraded = submission.status === 'GRADED'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Grade Submission
        </CardTitle>
        <CardDescription>
          Grading submission by {submission.student.name}
        </CardDescription>
        {isAlreadyGraded && (
          <Badge variant="secondary" className="w-fit">
            <CheckCircle className="h-3 w-3 mr-1" />
            Already Graded
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="pointsEarned"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Points Earned</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={submission.task.maxPoints}
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        value={field.value || ''}
                      />
                      <span className="text-sm text-gray-500">
                        / {submission.task.maxPoints}
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="feedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feedback (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide feedback to help the student improve..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isAlreadyGraded ? 'Update Grade' : 'Submit Grade'}
              </Button>
            </div>
          </form>
        </Form>

        {/* Grade Summary */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Grade Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Points:</span>
              <span className="ml-2 font-medium">
                {form.watch('pointsEarned') || 0} / {submission.task.maxPoints}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Percentage:</span>
              <span className="ml-2 font-medium">
                {submission.task.maxPoints > 0 
                  ? Math.round(((form.watch('pointsEarned') || 0) / submission.task.maxPoints) * 100)
                  : 0
                }%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
