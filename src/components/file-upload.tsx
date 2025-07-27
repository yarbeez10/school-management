'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { X, Upload, FileText, Loader2 } from 'lucide-react'

interface FileUploadProps {
  taskId: string
  onFilesUploaded: (files: UploadedFile[]) => void
  maxFiles?: number
  maxSizePerFile?: number
}

interface UploadedFile {
  fileName: string
  originalName: string
  filePath: string
  fileSize: number
  fileType: string
}

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed'
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function FileUpload({ 
  taskId, 
  onFilesUploaded, 
  maxFiles = 5,
  maxSizePerFile = MAX_FILE_SIZE 
}: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (file.size > maxSizePerFile) {
      return `File ${file.name} is too large. Maximum size is ${Math.round(maxSizePerFile / (1024 * 1024))}MB.`
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return `File type ${file.type} is not allowed.`
    }

    return null
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setError('')

    if (files.length + selectedFiles.length + uploadedFiles.length > maxFiles) {
      setError(`You can only upload up to ${maxFiles} files total.`)
      return
    }

    // Validate each file
    for (const file of files) {
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }
    }

    setSelectedFiles(prev => [...prev, ...files])
  }

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index)
      onFilesUploaded(newFiles)
      return newFiles
    })
  }

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return

    setIsUploading(true)
    setError('')

    try {
      const formData = new FormData()
      selectedFiles.forEach(file => {
        formData.append('files', file)
      })
      formData.append('taskId', taskId)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to upload files')
      }

      const result = await response.json()
      const newUploadedFiles = [...uploadedFiles, ...result.files]
      
      setUploadedFiles(newUploadedFiles)
      setSelectedFiles([])
      onFilesUploaded(newUploadedFiles)
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to upload files')
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileTypeIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️'
    if (fileType === 'application/pdf') return '📄'
    if (fileType.includes('word')) return '📝'
    if (fileType === 'text/plain') return '📄'
    if (fileType.includes('zip')) return '📦'
    return '📎'
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* File Input */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Click to select files or drag and drop
          </p>
          <p className="text-xs text-gray-500">
            PDF, DOC, DOCX, TXT, Images, ZIP (max {Math.round(maxSizePerFile / (1024 * 1024))}MB each)
          </p>
          <Input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_TYPES.join(',')}
            onChange={handleFileSelect}
            className="mt-2"
          />
        </div>
      </div>

      {/* Selected Files (not yet uploaded) */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Selected Files:</h4>
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm">{file.name}</span>
                <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeSelectedFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            onClick={uploadFiles}
            disabled={isUploading}
            className="w-full mt-2"
          >
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upload Files
          </Button>
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Uploaded Files:</h4>
          {uploadedFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-green-50 p-3 rounded border border-green-200">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getFileTypeIcon(file.fileType)}</span>
                <span className="text-sm">{file.originalName}</span>
                <span className="text-xs text-gray-500">({formatFileSize(file.fileSize)})</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeUploadedFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
