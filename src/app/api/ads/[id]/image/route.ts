import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/**
 * POST /api/ads/[id]/image — Upload ad image (manager+)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params

  let formData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('image') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type', details: `Allowed: ${ALLOWED_FILE_TYPES.join(', ')}` }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large', details: `Max: ${MAX_FILE_SIZE / 1024 / 1024}MB` }, { status: 400 })
  }

  const supabase = await createClient()

  // Verify ad exists
  const { data: ad, error: adError } = await supabase
    .from('advertisements')
    .select('id, image_url')
    .eq('id', id)
    .single()

  if (adError || !ad) {
    return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
  }

  // Delete old image if exists
  if (ad.image_url && ad.image_url.includes('ad-images')) {
    const urlParts = ad.image_url.split('/ad-images/')
    if (urlParts[1]) {
      await supabase.storage.from('ad-images').remove([urlParts[1]])
    }
  }

  // Upload new image
  const ext = file.type.split('/')[1] || 'webp'
  const filePath = `${id}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('ad-images')
    .upload(filePath, file, { cacheControl: '3600', upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from('ad-images').getPublicUrl(filePath)

  // Update ad record
  const { data: updatedAd, error: updateError } = await supabase
    .from('advertisements')
    .update({ image_url: publicUrl })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ image_url: publicUrl, ad: updatedAd })
}

/**
 * DELETE /api/ads/[id]/image — Remove ad image (manager+)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  const supabase = await createClient()

  const { data: ad, error: adError } = await supabase
    .from('advertisements')
    .select('id, image_url')
    .eq('id', id)
    .single()

  if (adError || !ad) {
    return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
  }

  if (!ad.image_url) {
    return NextResponse.json({ error: 'No image to delete' }, { status: 400 })
  }

  if (ad.image_url.includes('ad-images')) {
    const urlParts = ad.image_url.split('/ad-images/')
    if (urlParts[1]) {
      await supabase.storage.from('ad-images').remove([urlParts[1]])
    }
  }

  const { error: updateError } = await supabase
    .from('advertisements')
    .update({ image_url: null })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Image deleted successfully' })
}
