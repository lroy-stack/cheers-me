import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/**
 * POST /api/profile/avatar
 * Upload or update the user's avatar image
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth()

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { data: userData } = authResult

  let formData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { error: 'Invalid form data' },
      { status: 400 }
    )
  }

  const file = formData.get('avatar') as File | null

  if (!file) {
    return NextResponse.json(
      { error: 'No file provided' },
      { status: 400 }
    )
  }

  // Validate file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return NextResponse.json(
      {
        error: 'Invalid file type',
        details: `Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`,
      },
      { status: 400 }
    )
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        error: 'File too large',
        details: `Maximum file size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Delete old avatar if exists
  if (userData.profile.avatar_url) {
    const oldPath = userData.profile.avatar_url.split('/').pop()
    if (oldPath) {
      await supabase.storage
        .from('avatars')
        .remove([`${userData.user.id}/${oldPath}`])
    }
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}.${fileExt}`
  const filePath = `${userData.user.id}/${fileName}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 500 }
    )
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(filePath)

  // Update profile with new avatar URL
  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update({
      avatar_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userData.user.id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    avatar_url: publicUrl,
    profile: updatedProfile,
  })
}

/**
 * DELETE /api/profile/avatar
 * Remove the user's avatar image
 */
export async function DELETE(_request: NextRequest) {
  const authResult = await requireAuth()

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { data: userData } = authResult

  if (!userData.profile.avatar_url) {
    return NextResponse.json(
      { error: 'No avatar to delete' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Delete from storage
  const avatarPath = userData.profile.avatar_url.split('/').pop()
  if (avatarPath) {
    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove([`${userData.user.id}/${avatarPath}`])

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      )
    }
  }

  // Update profile to remove avatar URL
  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update({
      avatar_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userData.user.id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    message: 'Avatar deleted successfully',
    profile: updatedProfile,
  })
}
