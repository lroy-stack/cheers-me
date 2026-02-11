'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { Loader2, Save, ArrowLeft, Building2, Globe, Palette, Clock, Image as ImageIcon, Upload, RotateCcw, CalendarCheck, Monitor, UtensilsCrossed, Search, Info } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations } from 'next-intl'

interface RestaurantInfo {
  name: string
  legal_name: string
  address: string
  postal_code: string
  city: string
  country: string
  phone: string
  email: string
  website: string
  description: string
  instagram: string
  facebook: string
  google_maps_url: string
}

interface RestaurantBranding {
  logo_url: string
  favicon_url: string
  primary_color: string
  accent_color: string
  og_image_url: string
}

interface RestaurantWebConfig {
  seo_title: string
  meta_description: string
  booking_enabled: boolean
  kiosk_enabled: boolean
  digital_menu_enabled: boolean
}

interface RestaurantHours {
  opening: string
  closing: string
  season_start: string // MM-DD
  season_end: string   // MM-DD
}

const DEFAULT_INFO: RestaurantInfo = {
  name: 'GrandCafe Cheers',
  legal_name: '',
  address: 'Carrer de Cartago 22',
  postal_code: '07600',
  city: 'El Arenal, Mallorca',
  country: 'Spain',
  phone: '+34 971 XXX XXX',
  email: 'info@cheersmallorca.com',
  website: 'https://cheersmallorca.com',
  description: '',
  instagram: '@cheersmallorca',
  facebook: '',
  google_maps_url: '',
}

const DEFAULT_BRANDING: RestaurantBranding = {
  logo_url: '',
  favicon_url: '',
  primary_color: '#5C1520',
  accent_color: '#7A1D2B',
  og_image_url: '',
}

const DEFAULT_WEB: RestaurantWebConfig = {
  seo_title: 'GrandCafe Cheers | Mallorca',
  meta_description: 'Your beachfront destination for world kitchen, cocktails, sports, and live DJ nights.',
  booking_enabled: true,
  kiosk_enabled: true,
  digital_menu_enabled: true,
}

const DEFAULT_HOURS: RestaurantHours = {
  opening: '10:30',
  closing: '03:00',
  season_start: '04-01',
  season_end: '11-01',
}

export default function RestaurantSettingsPage() {
  const t = useTranslations('settings.restaurant')
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const [info, setInfo] = useState<RestaurantInfo>(DEFAULT_INFO)
  const [branding, setBranding] = useState<RestaurantBranding>(DEFAULT_BRANDING)
  const [web, setWeb] = useState<RestaurantWebConfig>(DEFAULT_WEB)
  const [hours, setHours] = useState<RestaurantHours>(DEFAULT_HOURS)
  const [uploading, setUploading] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/schedule')
      if (res.ok) {
        const data = await res.json()
        if (data.restaurant_info) setInfo({ ...DEFAULT_INFO, ...data.restaurant_info })
        if (data.restaurant_branding) setBranding({ ...DEFAULT_BRANDING, ...data.restaurant_branding })
        if (data.restaurant_web) setWeb({ ...DEFAULT_WEB, ...data.restaurant_web })
        if (data.restaurant_hours_config) setHours({ ...DEFAULT_HOURS, ...data.restaurant_hours_config })
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSave = async (key: string, value: unknown, label: string) => {
    setSaving(key)
    try {
      const res = await fetch('/api/settings/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      if (res.ok) {
        toast({ title: t('saved'), description: `${label} ${t('savedSuccessfully')}` })
      } else {
        toast({ title: t('error'), description: t('saveFailed'), variant: 'destructive' })
      }
    } catch {
      toast({ title: t('error'), description: t('saveFailed'), variant: 'destructive' })
    } finally {
      setSaving(null)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/settings/branding/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (res.ok && data.logo_url) {
        setBranding((prev) => ({ ...prev, logo_url: data.logo_url }))
        toast({ title: t('saved'), description: 'Logo uploaded successfully' })
      } else {
        toast({ title: t('error'), description: data.error || 'Upload failed', variant: 'destructive' })
      }
    } catch {
      toast({ title: t('error'), description: 'Upload failed', variant: 'destructive' })
    } finally {
      setUploading(false)
      // Reset file input
      e.target.value = ''
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToSettings')}
          </Link>
          <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Restaurant Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {t('infoTitle')}
            </CardTitle>
            <CardDescription>{t('infoDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('restaurantName')}</Label>
                <Input
                  value={info.name}
                  onChange={(e) => setInfo({ ...info, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('legalName')}</Label>
                <Input
                  value={info.legal_name}
                  onChange={(e) => setInfo({ ...info, legal_name: e.target.value })}
                  placeholder="S.L. / S.A."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>{t('address')}</Label>
                <Input
                  value={info.address}
                  onChange={(e) => setInfo({ ...info, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('postalCode')}</Label>
                <Input
                  value={info.postal_code}
                  onChange={(e) => setInfo({ ...info, postal_code: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('city')}</Label>
                <Input
                  value={info.city}
                  onChange={(e) => setInfo({ ...info, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('country')}</Label>
                <Input
                  value={info.country}
                  onChange={(e) => setInfo({ ...info, country: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('phone')}</Label>
                <Input
                  value={info.phone}
                  onChange={(e) => setInfo({ ...info, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('email')}</Label>
                <Input
                  type="email"
                  value={info.email}
                  onChange={(e) => setInfo({ ...info, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('website')}</Label>
              <Input
                value={info.website}
                onChange={(e) => setInfo({ ...info, website: e.target.value })}
                placeholder="https://"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('description')}</Label>
              <Textarea
                value={info.description}
                onChange={(e) => setInfo({ ...info, description: e.target.value })}
                placeholder={t('descriptionPlaceholder')}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Instagram</Label>
                <Input
                  value={info.instagram}
                  onChange={(e) => setInfo({ ...info, instagram: e.target.value })}
                  placeholder="@handle"
                />
              </div>
              <div className="space-y-2">
                <Label>Facebook</Label>
                <Input
                  value={info.facebook}
                  onChange={(e) => setInfo({ ...info, facebook: e.target.value })}
                  placeholder="https://facebook.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label>Google Maps</Label>
                <Input
                  value={info.google_maps_url}
                  onChange={(e) => setInfo({ ...info, google_maps_url: e.target.value })}
                  placeholder="https://maps.google.com/..."
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => handleSave('restaurant_info', info, t('infoTitle'))}
                disabled={saving === 'restaurant_info'}
              >
                {saving === 'restaurant_info' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {t('saveInfo')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              {t('brandingTitle')}
            </CardTitle>
            <CardDescription>{t('brandingDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('logoUrl')}</Label>
              <div className="flex items-start gap-4">
                {/* Logo preview */}
                <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                  <Image
                    src={branding.logo_url || '/icons/logoheader.png'}
                    alt="Logo"
                    width={80}
                    height={80}
                    className="w-full h-full object-contain"
                    unoptimized
                  />
                </div>
                {/* Upload controls */}
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/png,image/svg+xml,image/jpeg,image/webp"
                        onChange={handleLogoUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                        {uploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        {uploading ? 'Uploading...' : 'Upload Logo'}
                      </span>
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">PNG, SVG, JPEG, or WebP. Max 2MB.</p>
                  <p className="text-xs text-muted-foreground truncate max-w-sm">
                    {branding.logo_url ? branding.logo_url : 'Using default: /icons/logoheader.png'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('faviconUrl')}</Label>
              <Input
                value={branding.favicon_url}
                onChange={(e) => setBranding({ ...branding, favicon_url: e.target.value })}
                placeholder="/favicon.ico"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('primaryColor')}</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={branding.primary_color}
                    onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border border-border"
                  />
                  <Input
                    value={branding.primary_color}
                    onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                    className="font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('accentColor')}</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={branding.accent_color}
                    onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border border-border"
                  />
                  <Input
                    value={branding.accent_color}
                    onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Color Preview Strip */}
            {branding.primary_color && branding.accent_color && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card">
                  <div
                    className="w-10 h-10 rounded-md shadow-sm"
                    style={{ backgroundColor: branding.primary_color }}
                    title="Primary"
                  />
                  <div
                    className="w-10 h-10 rounded-md shadow-sm"
                    style={{ backgroundColor: branding.accent_color }}
                    title="Accent"
                  />
                  <div className="flex-1 ml-2">
                    <div className="flex gap-1.5">
                      <span
                        className="inline-block px-3 py-1 rounded-full text-white text-xs font-medium"
                        style={{ backgroundColor: branding.primary_color }}
                      >
                        Button
                      </span>
                      <span
                        className="inline-block px-3 py-1 rounded-full text-white text-xs font-medium"
                        style={{ backgroundColor: branding.accent_color }}
                      >
                        Badge
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBranding({
                      ...branding,
                      primary_color: DEFAULT_BRANDING.primary_color,
                      accent_color: DEFAULT_BRANDING.accent_color,
                    })}
                    title="Reset to defaults"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Reset
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('ogImage')}</Label>
              <div className="flex gap-2">
                <Input
                  value={branding.og_image_url}
                  onChange={(e) => setBranding({ ...branding, og_image_url: e.target.value })}
                  placeholder="/images/og-image.jpg"
                />
                <ImageIcon className="w-10 h-10 text-muted-foreground flex-shrink-0" />
              </div>
              <p className="text-xs text-muted-foreground">{t('ogImageHint')}</p>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => handleSave('restaurant_branding', branding, t('brandingTitle'))}
                disabled={saving === 'restaurant_branding'}
              >
                {saving === 'restaurant_branding' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {t('saveBranding')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Operating Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {t('hoursTitle')}
            </CardTitle>
            <CardDescription>{t('hoursDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('openingTime')}</Label>
                <Input
                  type="time"
                  value={hours.opening}
                  onChange={(e) => setHours({ ...hours, opening: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('closingTime')}</Label>
                <Input
                  type="time"
                  value={hours.closing}
                  onChange={(e) => setHours({ ...hours, closing: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('seasonStart')}</Label>
                <Input
                  value={hours.season_start}
                  onChange={(e) => setHours({ ...hours, season_start: e.target.value })}
                  placeholder="MM-DD (e.g. 04-01)"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('seasonEnd')}</Label>
                <Input
                  value={hours.season_end}
                  onChange={(e) => setHours({ ...hours, season_end: e.target.value })}
                  placeholder="MM-DD (e.g. 11-01)"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => handleSave('restaurant_hours_config', hours, t('hoursTitle'))}
                disabled={saving === 'restaurant_hours_config'}
              >
                {saving === 'restaurant_hours_config' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {t('saveHours')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Web & SEO Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              {t('webTitle')}
            </CardTitle>
            <CardDescription>{t('webDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* SEO section with hint */}
            <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Globe className="w-4 h-4" />
                SEO & Meta Tags
              </div>
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Applied to the public /booking page as Open Graph title and meta description for search engines and social sharing.
              </p>

              <div className="space-y-2">
                <Label>{t('seoTitle')}</Label>
                <Input
                  value={web.seo_title}
                  onChange={(e) => setWeb({ ...web, seo_title: e.target.value })}
                  placeholder="GrandCafe Cheers | Mallorca"
                />
                <p className="text-xs text-muted-foreground">Browser tab title & social share title</p>
              </div>

              <div className="space-y-2">
                <Label>{t('metaDescription')}</Label>
                <Textarea
                  value={web.meta_description}
                  onChange={(e) => setWeb({ ...web, meta_description: e.target.value })}
                  rows={2}
                  placeholder="Your beachfront destination for world kitchen, cocktails, sports, and live DJ nights."
                />
                <p className="text-xs text-muted-foreground">Google snippet & social share preview text (max 160 characters)</p>
              </div>
            </div>

            {/* Public Modules */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">{t('publicModules')}</p>
              <p className="text-xs text-muted-foreground">
                Toggle public-facing pages on or off. Disabled modules show a &quot;temporarily unavailable&quot; message to visitors.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  {
                    key: 'booking_enabled' as const,
                    label: t('bookingModule'),
                    description: '/booking',
                    icon: CalendarCheck,
                  },
                  {
                    key: 'kiosk_enabled' as const,
                    label: t('kioskModule'),
                    description: '/kiosk',
                    icon: Monitor,
                  },
                  {
                    key: 'digital_menu_enabled' as const,
                    label: t('digitalMenuModule'),
                    description: '/menu/digital',
                    icon: UtensilsCrossed,
                  },
                ] as const).map(({ key, label, description, icon: Icon }) => (
                  <label
                    key={key}
                    className={`relative flex flex-col gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      web[key]
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="w-5 h-5 text-foreground" />
                      <input
                        type="checkbox"
                        checked={web[key]}
                        onChange={(e) => setWeb({ ...web, [key]: e.target.checked })}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                    </div>
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-xs text-muted-foreground font-mono">{description}</span>
                    <span className={`text-xs font-medium ${web[key] ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                      {web[key] ? 'Active' : 'Disabled'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => handleSave('restaurant_web', web, t('webTitle'))}
                disabled={saving === 'restaurant_web'}
              >
                {saving === 'restaurant_web' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {t('saveWeb')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Toaster />
    </div>
  )
}
