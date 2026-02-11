'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Save,
  Send,
  Eye,
  Calendar as CalendarIcon,
  Sparkles,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { NewsletterPreview } from './newsletter-preview'
import { NewsletterTemplates } from './newsletter-templates'

const newsletterSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(255),
  content: z.string().min(1, 'Content is required'),
  html_content: z.string().optional(),
  segment: z.enum(['all', 'vip', 'language_nl', 'language_en', 'language_es']),
  status: z.enum(['draft', 'scheduled', 'sent', 'failed']),
  scheduled_date: z.string().optional().nullable(),
})

type NewsletterFormData = z.infer<typeof newsletterSchema>

interface NewsletterEditorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newsletter?: any
  onClose: () => void
  onSave: () => void
}

export function NewsletterEditor({ newsletter, onClose, onSave }: NewsletterEditorProps) {
  const t = useTranslations('marketing')
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<NewsletterFormData>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: newsletter || {
      subject: '',
      content: '',
      html_content: '',
      segment: 'all',
      status: 'draft',
      scheduled_date: null,
    },
  })

  const watchedContent = watch('content')
  const watchedSubject = watch('subject')
  const watchedSegment = watch('segment')
  const watchedHtmlContent = watch('html_content')

  useEffect(() => {
    if (newsletter?.scheduled_date) {
      setSelectedDate(new Date(newsletter.scheduled_date))
    }
  }, [newsletter])

  const handleSaveAsDraft = async (data: NewsletterFormData) => {
    setIsSaving(true)
    try {
      const payload = {
        ...data,
        status: 'draft',
        scheduled_date: selectedDate ? selectedDate.toISOString() : null,
      }

      const url = newsletter
        ? `/api/marketing/newsletters/${newsletter.id}`
        : '/api/marketing/newsletters'

      const response = await fetch(url, {
        method: newsletter ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Failed to save newsletter')

      toast({
        title: t('newsletter.success'),
        description: t('newsletter.savedAsDraft'),
      })

      onSave()
    } catch (error) {
      console.error('Error saving newsletter:', error)
      toast({
        title: t('newsletter.error'),
        description: t('newsletter.saveFailed'),
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSchedule = async (data: NewsletterFormData) => {
    if (!selectedDate) {
      toast({
        title: t('newsletter.error'),
        description: t('newsletter.scheduleDateRequired'),
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        ...data,
        status: 'scheduled',
        scheduled_date: selectedDate.toISOString(),
      }

      const url = newsletter
        ? `/api/marketing/newsletters/${newsletter.id}`
        : '/api/marketing/newsletters'

      const response = await fetch(url, {
        method: newsletter ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Failed to schedule newsletter')

      toast({
        title: t('newsletter.success'),
        description: t('newsletter.scheduledSuccess', { date: format(selectedDate, 'PPp') }),
      })

      onSave()
    } catch (error) {
      console.error('Error scheduling newsletter:', error)
      toast({
        title: t('newsletter.error'),
        description: t('newsletter.scheduleFailed'),
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleGenerateWithAI = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/marketing/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'newsletter',
          context: {
            subject: watchedSubject || 'Newsletter',
            segment: watchedSegment,
          },
        }),
      })

      if (!response.ok) throw new Error('Failed to generate content')

      const data = await response.json()

      if (data.content) {
        setValue('content', data.content)
      }

      if (data.subject && !watchedSubject) {
        setValue('subject', data.subject)
      }

      toast({
        title: t('newsletter.success'),
        description: t('newsletter.aiGenerated'),
      })
    } catch (error) {
      console.error('Error generating content:', error)
      toast({
        title: t('newsletter.error'),
        description: t('newsletter.aiGenerateFailed'),
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApplyTemplate = (template: { subject: string; content: string; html: string }) => {
    setValue('subject', template.subject)
    setValue('content', template.content)
    setValue('html_content', template.html)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {newsletter ? t('newsletter.title') : t('newsletter.createNewsletter')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('newsletter.composeDescription')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setActiveTab(activeTab === 'edit' ? 'preview' : 'edit')}
          >
            <Eye className="mr-2 h-4 w-4" />
            {activeTab === 'edit' ? t('newsletter.previewToggle') : t('newsletter.editToggle')}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')}>
        <TabsContent value="edit">
          <form className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Editor */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('newsletter.content')}</CardTitle>
                    <CardDescription>
                      {t('newsletter.writeContent')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="subject">{t('newsletter.subject')}</Label>
                      <Input
                        id="subject"
                        placeholder={t('newsletter.subjectPlaceholder')}
                        {...register('subject')}
                      />
                      {errors.subject && (
                        <p className="text-sm text-red-500">{errors.subject.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="content">{t('newsletter.content')}</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateWithAI}
                          disabled={isGenerating}
                        >
                          <Sparkles className="mr-2 h-3 w-3" />
                          {isGenerating ? t('createPost.generating') : t('newsletter.generateWithAI')}
                        </Button>
                      </div>
                      <Textarea
                        id="content"
                        placeholder={t('newsletter.contentPlaceholder')}
                        rows={12}
                        {...register('content')}
                      />
                      {errors.content && (
                        <p className="text-sm text-red-500">{errors.content.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="html_content">{t('newsletter.htmlContentLabel')}</Label>
                      <Textarea
                        id="html_content"
                        placeholder={t('newsletter.htmlContentPlaceholder')}
                        rows={6}
                        className="font-mono text-xs"
                        {...register('html_content')}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('newsletter.htmlContentHint')}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Templates */}
                <NewsletterTemplates onApplyTemplate={handleApplyTemplate} />
              </div>

              {/* Sidebar Settings */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('newsletter.settings')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="segment">{t('newsletter.recipients')}</Label>
                      <Select
                        value={watchedSegment}
                        onValueChange={(value) => setValue('segment', value as NewsletterFormData['segment'])}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('newsletter.allSubscribers')}</SelectItem>
                          <SelectItem value="vip">{t('newsletter.vipOnly')}</SelectItem>
                          <SelectItem value="language_nl">{t('newsletter.dutchSpeakers')}</SelectItem>
                          <SelectItem value="language_en">{t('newsletter.englishSpeakers')}</SelectItem>
                          <SelectItem value="language_es">{t('newsletter.spanishSpeakers')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('newsletter.schedule')}</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, 'PPp') : t('newsletter.pickDate')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('newsletter.actions')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleSubmit(handleSaveAsDraft)}
                      disabled={isSaving}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {t('newsletter.draft')}
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      className="w-full"
                      onClick={handleSubmit(handleSchedule)}
                      disabled={isSaving || !selectedDate}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {t('newsletter.schedule')}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="preview">
          <NewsletterPreview
            subject={watchedSubject}
            content={watchedContent}
            htmlContent={watchedHtmlContent}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
