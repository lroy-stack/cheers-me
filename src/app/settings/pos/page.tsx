'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, RefreshCw, Wifi, WifiOff, AlertCircle } from 'lucide-react'
import { POSIntegrationForm } from '@/components/settings/pos-integration-form'
import { POSSyncStatus } from '@/components/settings/pos-sync-status'
import type { POSIntegration } from '@/types'

export default function POSSettingsPage() {
  const t = useTranslations('settings.pos')
  const [integrations, setIntegrations] = useState<POSIntegration[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchIntegrations()
  }, [])

  const fetchIntegrations = async () => {
    try {
      const res = await fetch('/api/settings/pos')
      if (res.ok) {
        const data = await res.json()
        setIntegrations(data)
      }
    } catch (err) {
      console.error('Failed to fetch POS integrations:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async (id: string) => {
    try {
      await fetch(`/api/settings/pos/${id}/sync`, { method: 'POST' })
      await fetchIntegrations()
    } catch (err) {
      console.error('Sync failed:', err)
    }
  }

  const handleTest = async (id: string) => {
    try {
      const res = await fetch(`/api/settings/pos/${id}/test`, { method: 'POST' })
      const result = await res.json()
      alert(result.message || 'Test completed')
    } catch (err) {
      console.error('Test failed:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return
    try {
      await fetch(`/api/settings/pos/${id}`, { method: 'DELETE' })
      await fetchIntegrations()
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const statusIcons: Record<string, React.ReactNode> = {
    active: <Wifi className="h-4 w-4 text-green-500" />,
    paused: <WifiOff className="h-4 w-4 text-yellow-500" />,
    error: <AlertCircle className="h-4 w-4 text-red-500" />,
    disconnected: <WifiOff className="h-4 w-4 text-muted-foreground" />,
  }

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    disconnected: 'bg-muted text-foreground dark:bg-card dark:text-foreground',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">{t('subtitle')}</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('addIntegration')}
        </Button>
      </div>

      {showForm && (
        <POSIntegrationForm
          onSuccess={() => {
            setShowForm(false)
            fetchIntegrations()
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">{t('loading')}</div>
      ) : integrations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <WifiOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('noIntegrations')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('noIntegrationsDesc')}
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('addFirstIntegration')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {integrations.map((integration) => (
            <Card key={integration.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {statusIcons[integration.status]}
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <CardDescription className="capitalize">{integration.provider}</CardDescription>
                    </div>
                  </div>
                  <Badge className={statusColors[integration.status]}>
                    {integration.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <POSSyncStatus integration={integration} />
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => handleSync(integration.id)}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    {t('syncNow')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleTest(integration.id)}>
                    {t('testConnection')}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(integration.id)}>
                    {t('delete')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
