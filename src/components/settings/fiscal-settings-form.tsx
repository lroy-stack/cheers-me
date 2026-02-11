'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'

interface FiscalData {
  razon_social: string
  cif: string
  direccion: string
  codigo_postal: string
  ciudad: string
  provincia: string
  pais: string
  telefono: string
  email: string
}

const DEFAULT_FISCAL_DATA: FiscalData = {
  razon_social: '',
  cif: '',
  direccion: '',
  codigo_postal: '',
  ciudad: '',
  provincia: '',
  pais: 'Espana',
  telefono: '',
  email: '',
}

export function FiscalSettingsForm() {
  const t = useTranslations('settings.fiscal')
  const { toast } = useToast()
  const [formData, setFormData] = useState<FiscalData>(DEFAULT_FISCAL_DATA)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchFiscalData() {
      try {
        setLoading(true)
        const res = await fetch('/api/settings/schedule')
        if (res.ok) {
          const data = await res.json()
          if (data.company_fiscal) {
            setFormData({ ...DEFAULT_FISCAL_DATA, ...data.company_fiscal })
          }
        }
      } catch {
        // Use defaults on error
      } finally {
        setLoading(false)
      }
    }

    fetchFiscalData()
  }, [])

  const handleChange = (field: keyof FiscalData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const res = await fetch('/api/settings/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'company_fiscal', value: formData }),
      })

      if (res.ok) {
        toast({
          title: t('saved'),
          variant: 'default',
        })
      } else {
        toast({
          title: t('saveError'),
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: t('saveError'),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('title')}</CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="razon_social">{t('razonSocial')}</Label>
            <Input
              id="razon_social"
              value={formData.razon_social}
              onChange={(e) => handleChange('razon_social', e.target.value)}
              placeholder="Mi Empresa S.L."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cif">{t('cif')}</Label>
            <Input
              id="cif"
              value={formData.cif}
              onChange={(e) => handleChange('cif', e.target.value)}
              placeholder="B12345678"
            />
            <p className="text-xs text-muted-foreground">
              Format: Letter + 8 digits (e.g., B12345678)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="admin@empresa.com"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="direccion">{t('direccion')}</Label>
            <Input
              id="direccion"
              value={formData.direccion}
              onChange={(e) => handleChange('direccion', e.target.value)}
              placeholder="Calle Principal 1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="codigo_postal">{t('codigoPostal')}</Label>
            <Input
              id="codigo_postal"
              value={formData.codigo_postal}
              onChange={(e) => handleChange('codigo_postal', e.target.value)}
              placeholder="07600"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ciudad">{t('ciudad')}</Label>
            <Input
              id="ciudad"
              value={formData.ciudad}
              onChange={(e) => handleChange('ciudad', e.target.value)}
              placeholder="Palma de Mallorca"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="provincia">{t('provincia')}</Label>
            <Input
              id="provincia"
              value={formData.provincia}
              onChange={(e) => handleChange('provincia', e.target.value)}
              placeholder="Illes Balears"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono">{t('telefono')}</Label>
            <Input
              id="telefono"
              value={formData.telefono}
              onChange={(e) => handleChange('telefono', e.target.value)}
              placeholder="+34 971 123 456"
            />
          </div>
        </div>

        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {t('title')}
        </Button>
      </CardContent>
    </Card>
  )
}
