'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Sparkles, Loader2, X } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'
import { ImageUpload } from './image-upload'
import { PostPreview } from './post-preview'
import { AIGenerateDialog } from './ai-generate-dialog'

const postSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content_text: z.string().min(1, 'Caption is required').max(2200, 'Caption too long'),
  platform: z.enum(['instagram', 'facebook', 'multi'], {
    required_error: 'Please select a platform',
  }),
  language: z.enum(['nl', 'en', 'es'], {
    required_error: 'Please select a language',
  }),
  scheduled_date: z.date().optional(),
  image_url: z.string().url().optional().or(z.literal('')),
})

type PostFormValues = z.infer<typeof postSchema>

interface PostCreatorFormProps {
  onSubmit: (data: PostFormValues & { status: 'draft' | 'scheduled' }) => Promise<void>
  initialData?: Partial<PostFormValues>
  isEditing?: boolean
}

export function PostCreatorForm({ onSubmit, initialData, isEditing: _isEditing }: PostCreatorFormProps) {
  const t = useTranslations('marketing')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAIDialog, setShowAIDialog] = useState(false)
  const [, setImageFile] = useState<File | null>(null)
  const { toast } = useToast()

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: initialData?.title || '',
      content_text: initialData?.content_text || '',
      platform: initialData?.platform || 'instagram',
      language: initialData?.language || 'en',
      scheduled_date: initialData?.scheduled_date
        ? new Date(initialData.scheduled_date)
        : undefined,
      image_url: initialData?.image_url || '',
    },
  })

  const handleAIGenerate = async (
    topic: string,
    language: 'nl' | 'en' | 'es',
    tone: 'casual' | 'professional' | 'playful' | 'elegant',
    includeHashtags: boolean
  ) => {
    try {
      const response = await fetch('/api/marketing/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'post',
          topic,
          language,
          platform: form.getValues('platform'),
          tone,
          include_hashtags: includeHashtags,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate content')
      }

      const data = await response.json()

      // Update form with AI-generated content
      const caption = data.content.caption || ''
      const hashtags = data.content.hashtags || ''
      const fullCaption = includeHashtags && hashtags
        ? `${caption}\n\n${hashtags}`
        : caption

      form.setValue('content_text', fullCaption)
      form.setValue('language', language)

      // Auto-generate title from first line of caption
      const firstLine = caption.split('\n')[0].slice(0, 50)
      if (!form.getValues('title')) {
        form.setValue('title', firstLine)
      }

      toast({
        title: t('createPost.contentGenerated'),
        description: t('createPost.contentGeneratedDesc'),
      })

      setShowAIDialog(false)
    } catch (error) {
      console.error('AI generation error:', error)
      toast({
        title: t('createPost.generationFailed'),
        description: t('createPost.generationFailedDesc'),
        variant: 'destructive',
      })
    }
  }

  const handleImageUpload = async (file: File) => {
    setImageFile(file)

    // Create a local preview URL
    const previewUrl = URL.createObjectURL(file)
    form.setValue('image_url', previewUrl)

    // TODO: Upload to Supabase Storage
    // For now, we're using a local preview
    // In production, you would upload to storage.buckets.get('social-media-images')
    // and get back a public URL
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    form.setValue('image_url', '')
  }

  const handleFormSubmit = async (values: PostFormValues, status: 'draft' | 'scheduled') => {
    setIsSubmitting(true)
    try {
      await onSubmit({ ...values, status })
    } finally {
      setIsSubmitting(false)
    }
  }

  const watchedValues = form.watch()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column: Form */}
      <div className="space-y-6">
        <Form {...form}>
          <form className="space-y-4">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('createPost.postTitle')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('createPost.titlePlaceholder')} {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('createPost.titleHint')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Platform & Language */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('createPost.platform')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('createPost.platform')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="instagram">{t('contentCalendar.instagram')}</SelectItem>
                        <SelectItem value="facebook">{t('contentCalendar.facebook')}</SelectItem>
                        <SelectItem value="multi">{t('createPost.bothMultiPost')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('createPost.language')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('createPost.selectLanguage')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="en">🇬🇧 {t('createPost.langEnglish')}</SelectItem>
                        <SelectItem value="nl">🇳🇱 {t('createPost.langNederlands')}</SelectItem>
                        <SelectItem value="es">🇪🇸 {t('createPost.langEspanol')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* AI Generate Button */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAIDialog(true)}
                className="flex-1"
              >
                <Sparkles className="mr-2 h-4 w-4 text-primary" />
                {t('createPost.generate')}
              </Button>
            </div>

            {/* Caption */}
            <FormField
              control={form.control}
              name="content_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('contentCalendar.caption')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('createPost.captionPlaceholder')}
                      className="min-h-[200px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('createPost.characterCount', { count: field.value.length })}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Image Upload */}
            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('contentCalendar.media')}</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      {!field.value ? (
                        <ImageUpload onUpload={handleImageUpload} />
                      ) : (
                        <div className="relative">
                          <img
                            src={field.value}
                            alt={t('createPost.postImage')}
                            className="w-full h-48 object-cover rounded-md"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={handleRemoveImage}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    {t('createPost.imageRecommendation')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Schedule Date */}
            <FormField
              control={form.control}
              name="scheduled_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('createPost.schedule')}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP p')
                          ) : (
                            <span>{t('createPost.pickDateTime')}</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    {t('createPost.scheduleHint')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleFormSubmit(form.getValues(), 'draft')}
                disabled={isSubmitting || !form.formState.isValid}
                className="flex-1"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {t('createPost.saveDraft')}
              </Button>

              <Button
                type="button"
                onClick={() => handleFormSubmit(form.getValues(), 'scheduled')}
                disabled={isSubmitting || !form.formState.isValid}
                className="flex-1"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {form.getValues('scheduled_date') ? t('createPost.schedule') : t('createPost.publishNow')}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {/* Right Column: Live Preview */}
      <div className="lg:sticky lg:top-6 lg:h-fit">
        <PostPreview
          caption={watchedValues.content_text || ''}
          imageUrl={watchedValues.image_url || ''}
          platform={watchedValues.platform || 'instagram'}
          language={watchedValues.language || 'en'}
        />
      </div>

      {/* AI Generate Dialog */}
      <AIGenerateDialog
        open={showAIDialog}
        onOpenChange={setShowAIDialog}
        onGenerate={handleAIGenerate}
        currentLanguage={form.getValues('language')}
      />
    </div>
  )
}
