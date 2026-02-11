'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Switch } from '@/components/ui/switch'
import { Sparkles, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

const aiGenerateSchema = z.object({
  topic: z.string().min(3, 'Topic must be at least 3 characters').max(500),
  language: z.enum(['nl', 'en', 'es']),
  tone: z.enum(['casual', 'professional', 'playful', 'elegant']),
  includeHashtags: z.boolean(),
  context: z.string().max(1000).optional(),
})

type AIGenerateFormValues = z.infer<typeof aiGenerateSchema>

interface AIGenerateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerate: (
    topic: string,
    language: 'nl' | 'en' | 'es',
    tone: 'casual' | 'professional' | 'playful' | 'elegant',
    includeHashtags: boolean
  ) => Promise<void>
  currentLanguage?: 'nl' | 'en' | 'es'
}

export function AIGenerateDialog({
  open,
  onOpenChange,
  onGenerate,
  currentLanguage = 'en',
}: AIGenerateDialogProps) {
  const t = useTranslations('marketing')
  const [isGenerating, setIsGenerating] = useState(false)

  const form = useForm<AIGenerateFormValues>({
    resolver: zodResolver(aiGenerateSchema),
    defaultValues: {
      topic: '',
      language: currentLanguage,
      tone: 'casual',
      includeHashtags: true,
      context: '',
    },
  })

  const handleSubmit = async (values: AIGenerateFormValues) => {
    setIsGenerating(true)
    try {
      await onGenerate(values.topic, values.language, values.tone, values.includeHashtags)
      form.reset()
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('aiGenerate.title')}
          </DialogTitle>
          <DialogDescription>
            {t('aiGenerate.description')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Topic */}
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('aiGenerate.topicLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('aiGenerate.topicPlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('aiGenerate.topicHint')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Language & Tone */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('aiGenerate.language')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('aiGenerate.selectLanguage')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="en">🇬🇧 {t('aiGenerate.langEnglish')}</SelectItem>
                        <SelectItem value="nl">🇳🇱 {t('aiGenerate.langNederlands')}</SelectItem>
                        <SelectItem value="es">🇪🇸 {t('aiGenerate.langEspanol')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('createPost.tone')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('aiGenerate.selectTone')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="casual">😊 {t('aiGenerate.toneCasual')}</SelectItem>
                        <SelectItem value="professional">💼 {t('aiGenerate.toneProfessional')}</SelectItem>
                        <SelectItem value="playful">🎉 {t('aiGenerate.tonePlayful')}</SelectItem>
                        <SelectItem value="elegant">✨ {t('aiGenerate.toneElegant')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Include Hashtags */}
            <FormField
              control={form.control}
              name="includeHashtags"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>{t('contentCalendar.hashtags')}</FormLabel>
                    <FormDescription className="text-xs">
                      {t('aiGenerate.hashtagsHint')}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Optional Context */}
            <FormField
              control={form.control}
              name="context"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('aiGenerate.contextLabel')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('aiGenerate.contextPlaceholder')}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('aiGenerate.contextHint')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isGenerating}
                className="flex-1"
              >
                {t('aiGenerate.cancel')}
              </Button>
              <Button type="submit" disabled={isGenerating} className="flex-1">
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('createPost.generating')}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t('createPost.generate')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
