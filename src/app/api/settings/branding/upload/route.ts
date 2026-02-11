import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp']

/**
 * POST /api/settings/branding/upload
 * Upload a logo file to Supabase Storage (branding bucket)
 * and update the restaurant_branding setting with the public URL
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Invalid file type: ${file.type}. Allowed: PNG, SVG, JPEG, WebP` },
      { status: 400 }
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max: 2MB` },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Generate a unique filename
  const ext = file.name.split('.').pop() || 'png'
  const filename = `logo-${Date.now()}.${ext}`

  // Upload to Supabase Storage
  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadError } = await supabase.storage
    .from('branding')
    .upload(filename, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    console.error('[branding/upload] Storage error:', uploadError)
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 }
    )
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('branding')
    .getPublicUrl(filename)

  const publicUrl = urlData.publicUrl

  // Update restaurant_branding setting with the new logo URL
  // First fetch existing branding to merge
  const { data: existingRows } = await supabase
    .from('restaurant_settings')
    .select('value')
    .eq('key', 'restaurant_branding')
    .single()

  const existingBranding = (existingRows?.value as Record<string, unknown>) || {}
  const updatedBranding = { ...existingBranding, logo_url: publicUrl }

  const { error: upsertError } = await supabase
    .from('restaurant_settings')
    .upsert(
      {
        key: 'restaurant_branding',
        value: updatedBranding,
        updated_by: authResult.data.user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )

  if (upsertError) {
    console.error('[branding/upload] Settings upsert error:', upsertError)
    return NextResponse.json(
      { error: `Failed to save branding settings: ${upsertError.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, logo_url: publicUrl })
}
