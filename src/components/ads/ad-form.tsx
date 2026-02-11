'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { Advertisement, AdTemplate, AdPlacement, AdDisplayPage } from '@/types'
import AdTemplatePicker from './ad-template-picker'
import AdImageUpload from './ad-image-upload'
import { Loader2 } from 'lucide-react'

interface AdFormProps {
  ad?: Advertisement
  onSuccess?: () => void
}

const LANGUAGES = ['en', 'nl', 'es', 'de'] as const
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function AdForm({ ad, onSuccess }: AdFormProps) {
  const t = useTranslations('ads')
  const router = useRouter()
  const isEdit = !!ad

  const [saving, setSaving] = useState(false)
  const [activeLang, setActiveLang] = useState<'en' | 'nl' | 'es' | 'de'>('en')
  const [form, setForm] = useState({
    title_en: ad?.title_en || '',
    title_nl: ad?.title_nl || '',
    title_es: ad?.title_es || '',
    title_de: ad?.title_de || '',
    description_en: ad?.description_en || '',
    description_nl: ad?.description_nl || '',
    description_es: ad?.description_es || '',
    description_de: ad?.description_de || '',
    cta_text_en: ad?.cta_text_en || '',
    cta_text_nl: ad?.cta_text_nl || '',
    cta_text_es: ad?.cta_text_es || '',
    cta_text_de: ad?.cta_text_de || '',
    cta_url: ad?.cta_url || '',
    background_color: ad?.background_color || '#1a1a2e',
    text_color: ad?.text_color || '#ffffff',
    template: (ad?.template || 'custom') as AdTemplate,
    placement: (ad?.placement || 'banner_top') as AdPlacement,
    display_pages: (ad?.display_pages || ['digital_menu']) as AdDisplayPage[],
    start_date: ad?.start_date || '',
    end_date: ad?.end_date || '',
    start_time: ad?.start_time || '',
    end_time: ad?.end_time || '',
    days_of_week: ad?.days_of_week || [0, 1, 2, 3, 4, 5, 6],
    priority: ad?.priority || 0,
    status: ad?.status || 'draft',
  })

  const [imageUrl, setImageUrl] = useState(ad?.image_url || null)

  const updateField = (field: string, value: unknown) => {
    setForm(f => ({ ...f, [field]: value }))
  }

  const handleSubmit = async (targetStatus?: string) => {
    setSaving(true)
    const body = {
      ...form,
      cta_url: form.cta_url || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      status: targetStatus || form.status,
    }

    try {
      const url = isEdit ? `/api/ads/${ad.id}` : '/api/ads'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        if (onSuccess) {
          onSuccess()
        } else {
          router.push('/ads')
        }
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  const toggleDayOfWeek = (day: number) => {
    const current = form.days_of_week
    updateField('days_of_week', current.includes(day) ? current.filter(d => d !== day) : [...current, day])
  }

  const toggleDisplayPage = (page: AdDisplayPage) => {
    const current = form.display_pages
    if (current.includes(page)) {
      if (current.length > 1) updateField('display_pages', current.filter(p => p !== page))
    } else {
      updateField('display_pages', [...current, page])
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Template Picker */}
      <div>
        <label className="block text-sm font-medium mb-2">{t('template.label')}</label>
        <AdTemplatePicker selected={form.template} onChange={v => updateField('template', v)} />
      </div>

      {/* Language Tabs + Content */}
      <div>
        <label className="block text-sm font-medium mb-2">{t('form.content')}</label>
        <div className="flex gap-1 mb-3">
          {LANGUAGES.map(lang => (
            <button
              key={lang}
              type="button"
              onClick={() => setActiveLang(lang)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeLang === lang ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {t(`tabs.${lang}`)}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder={t('form.titleLabel')}
            value={form[`title_${activeLang}`] as string}
            onChange={e => updateField(`title_${activeLang}`, e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
          />
          <textarea
            placeholder={t('form.descriptionLabel')}
            value={form[`description_${activeLang}`] as string}
            onChange={e => updateField(`description_${activeLang}`, e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none"
          />
          <input
            type="text"
            placeholder={t('form.ctaText')}
            value={form[`cta_text_${activeLang}`] as string}
            onChange={e => updateField(`cta_text_${activeLang}`, e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
          />
        </div>
      </div>

      {/* CTA URL */}
      <div>
        <label className="block text-sm font-medium mb-1">{t('form.ctaUrl')}</label>
        <input
          type="url"
          value={form.cta_url}
          onChange={e => updateField('cta_url', e.target.value)}
          placeholder="https://..."
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
        />
      </div>

      {/* Visual Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('form.backgroundColor')}</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={form.background_color}
              onChange={e => updateField('background_color', e.target.value)}
              className="w-10 h-10 rounded border border-border cursor-pointer"
            />
            <input
              type="text"
              value={form.background_color}
              onChange={e => updateField('background_color', e.target.value)}
              className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('form.textColor')}</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={form.text_color}
              onChange={e => updateField('text_color', e.target.value)}
              className="w-10 h-10 rounded border border-border cursor-pointer"
            />
            <input
              type="text"
              value={form.text_color}
              onChange={e => updateField('text_color', e.target.value)}
              className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-sm"
            />
          </div>
        </div>
      </div>

      {/* Image Upload */}
      {isEdit && (
        <div>
          <label className="block text-sm font-medium mb-1">{t('form.image')}</label>
          <AdImageUpload adId={ad.id} currentImageUrl={imageUrl} onImageChange={setImageUrl} />
        </div>
      )}

      {/* Placement & Display Pages */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('placement.label')}</label>
          <select
            value={form.placement}
            onChange={e => updateField('placement', e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
          >
            {['banner_top', 'between_categories', 'fullscreen_overlay'].map(p => (
              <option key={p} value={p}>{t(`placement.${p}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('displayPages.label')}</label>
          <div className="flex gap-2 mt-1">
            {(['digital_menu', 'booking'] as AdDisplayPage[]).map(page => (
              <button
                key={page}
                type="button"
                onClick={() => toggleDisplayPage(page)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  form.display_pages.includes(page)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {t(`displayPages.${page}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scheduling */}
      <div>
        <label className="block text-sm font-medium mb-2">{t('form.scheduling')}</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">{t('form.startDate')}</label>
            <input type="date" value={form.start_date} onChange={e => updateField('start_date', e.target.value)} className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t('form.endDate')}</label>
            <input type="date" value={form.end_date} onChange={e => updateField('end_date', e.target.value)} className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t('form.startTime')}</label>
            <input type="time" value={form.start_time} onChange={e => updateField('start_time', e.target.value)} className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t('form.endTime')}</label>
            <input type="time" value={form.end_time} onChange={e => updateField('end_time', e.target.value)} className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" />
          </div>
        </div>

        {/* Days of week */}
        <div className="mt-3">
          <label className="text-xs text-muted-foreground">{t('form.daysOfWeek')}</label>
          <div className="flex gap-1 mt-1">
            {DAYS.map((day, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleDayOfWeek(i)}
                className={`w-9 h-9 rounded-full text-xs font-medium transition-colors ${
                  form.days_of_week.includes(i)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium mb-1">{t('form.priority')}</label>
        <input
          type="number"
          value={form.priority}
          onChange={e => updateField('priority', parseInt(e.target.value) || 0)}
          className="w-24 px-3 py-2 rounded-md border border-border bg-background text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">{t('form.priorityHelp')}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => handleSubmit('draft')}
          disabled={saving}
          className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          {t('form.saveDraft')}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit('active')}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('form.publish')}
        </button>
      </div>
    </div>
  )
}
