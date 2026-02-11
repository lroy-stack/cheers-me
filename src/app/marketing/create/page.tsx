'use client'

import { useRouter } from 'next/navigation'
import { PostCreatorForm } from '@/components/marketing/post-creator-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'

export default function CreatePostPage() {
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('marketing')

  const handleSubmit = async (data: any) => {
    try {
      // Step 1: Create content calendar entry
      const calendarPayload = {
        title: data.title,
        content_text: data.content_text,
        image_url: data.image_url || null,
        platform: data.platform,
        language: data.language,
        scheduled_date: data.scheduled_date ? data.scheduled_date.toISOString() : null,
        status: data.status,
      }

      const calendarResponse = await fetch('/api/marketing/content-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calendarPayload),
      })

      if (!calendarResponse.ok) {
        const errorData = await calendarResponse.json()
        throw new Error(errorData.error || 'Failed to create post')
      }

      const calendarEntry = await calendarResponse.json()

      // Step 2: If status is 'scheduled' or 'published', create social_posts records
      if (data.status === 'scheduled' || data.status === 'published') {
        const platforms =
          data.platform === 'multi' ? ['instagram', 'facebook'] : [data.platform]

        for (const platform of platforms) {
          const socialPostPayload = {
            content_calendar_id: calendarEntry.id,
            platform,
            caption: data.content_text,
            image_url: data.image_url || null,
            published_at: data.scheduled_date ? data.scheduled_date.toISOString() : new Date().toISOString(),
            status: data.status === 'published' ? 'published' : 'pending',
          }

          const socialPostResponse = await fetch('/api/marketing/social-posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(socialPostPayload),
          })

          if (!socialPostResponse.ok) {
            console.error(`Failed to create social post for ${platform}`)
          }
        }
      }

      // Success!
      toast({
        title: t('common.success'),
        description:
          data.status === 'draft'
            ? t('createPost.savedAsDraft')
            : data.scheduled_date
              ? t('createPost.scheduledSuccess')
              : t('createPost.publishedSuccess'),
      })

      // Navigate back to calendar
      router.push('/marketing')
    } catch (error) {
      console.error('Error creating post:', error)
      toast({
        title: t('createPost.error'),
        description: error instanceof Error ? error.message : t('common.postCreateFailed'),
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-indigo-500" />
              {t('createPost.title')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('createPost.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Post Creator Form */}
      <PostCreatorForm onSubmit={handleSubmit} />
    </div>
  )
}
