'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTranslations } from 'next-intl'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Save } from 'lucide-react'
import type { Profile } from '@/types'

interface ProfileFormProps {
  profile: Profile
  onUpdate?: (profile: Profile) => void
}

export function ProfileForm({ profile, onUpdate }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const t = useTranslations('settings.form')

  const profileSchema = z.object({
    full_name: z.string().min(2, t('fullNameMin')),
    phone: z.string().optional(),
    language: z.enum(['en', 'nl', 'es', 'de']),
    emergency_contact: z.string().optional(),
    emergency_phone: z.string().optional(),
  })

  type ProfileFormData = z.infer<typeof profileSchema>

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile.full_name || '',
      phone: profile.phone || '',
      language: profile.language,
      emergency_contact: profile.emergency_contact || '',
      emergency_phone: profile.emergency_phone || '',
    },
  })

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile')
      }

      setSuccess(true)
      onUpdate?.(result.profile)

      // Update locale cookie if language changed and refresh to apply
      if (data.language !== profile.language) {
        document.cookie = `NEXT_LOCALE=${data.language};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`
        router.refresh()
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>
          {t('subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fullName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('fullNamePlaceholder')} disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('phone')}</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder={t('phonePlaceholder')}
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('phoneDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('language')}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('languagePlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="en">{t('languageEn')}</SelectItem>
                        <SelectItem value="nl">{t('languageNl')}</SelectItem>
                        <SelectItem value="es">{t('languageEs')}</SelectItem>
                        <SelectItem value="de">{t('languageDe')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t('languageDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-medium">{t('emergencyContact')}</h3>

              <FormField
                control={form.control}
                name="emergency_contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('emergencyContactName')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('emergencyContactNamePlaceholder')}
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emergency_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('emergencyContactPhone')}</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder={t('emergencyContactPhonePlaceholder')}
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('emergencyContactPhoneDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Status Messages */}
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-600 dark:text-green-400">
                {t('success')}
              </div>
            )}

            {/* Submit Button */}
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {t('saveChanges')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
