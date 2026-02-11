import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processFile } from '@/lib/ai/file-processor'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILES = 5
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} files allowed` },
        { status: 400 }
      )
    }

    const attachments = await Promise.all(
      files.map(async (file) => {
        if (!ALLOWED_TYPES.has(file.type)) {
          return {
            id: crypto.randomUUID(),
            filename: file.name,
            mimeType: file.type,
            fileSize: file.size,
            processedContent: `[Unsupported type: ${file.type}]`,
          }
        }

        if (file.size > MAX_FILE_SIZE) {
          return {
            id: crypto.randomUUID(),
            filename: file.name,
            mimeType: file.type,
            fileSize: file.size,
            processedContent: '[File too large (max 10MB)]',
          }
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        return processFile(buffer, file.name, file.type)
      })
    )

    return NextResponse.json({ attachments })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
