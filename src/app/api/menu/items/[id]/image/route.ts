import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * POST /api/menu/items/[id]/image
 * Upload image for a menu item (managers/admins only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
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
    return NextResponse.json(
      {
        error: 'Invalid file type',
        details: `Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`,
      },
      { status: 400 }
    )
  }

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

  // Verify menu item exists
  const { data: menuItem, error: itemError } = await supabase
    .from('menu_items')
    .select('id, photo_url')
    .eq('id', id)
    .single()

  if (itemError || !menuItem) {
    return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
  }

  // Delete old image from bucket if exists and is from our bucket
  if (menuItem.photo_url && menuItem.photo_url.includes('menu-images')) {
    const urlParts = menuItem.photo_url.split('/menu-images/')
    if (urlParts[1]) {
      await supabase.storage.from('menu-images').remove([urlParts[1]])
    }
  }

  // Upload new image
  const fileName = `${Date.now()}.webp`
  const filePath = `${id}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('menu-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from('menu-images').getPublicUrl(filePath)

  // Update menu item with new photo URL
  const { data: updatedItem, error: updateError } = await supabase
    .from('menu_items')
    .update({ photo_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    photo_url: publicUrl,
    menu_item: updatedItem,
  })
}

/**
 * DELETE /api/menu/items/[id]/image
 * Remove image from a menu item (managers/admins only)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params
  const supabase = await createClient()

  // Get current item
  const { data: menuItem, error: itemError } = await supabase
    .from('menu_items')
    .select('id, photo_url')
    .eq('id', id)
    .single()

  if (itemError || !menuItem) {
    return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
  }

  if (!menuItem.photo_url) {
    return NextResponse.json({ error: 'No image to delete' }, { status: 400 })
  }

  // Delete from storage if it's in our bucket
  if (menuItem.photo_url.includes('menu-images')) {
    const urlParts = menuItem.photo_url.split('/menu-images/')
    if (urlParts[1]) {
      const { error: deleteError } = await supabase.storage
        .from('menu-images')
        .remove([urlParts[1]])

      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message },
          { status: 500 }
        )
      }
    }
  }

  // Set photo_url to null
  const { error: updateError } = await supabase
    .from('menu_items')
    .update({ photo_url: null, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Image deleted successfully' })
}
