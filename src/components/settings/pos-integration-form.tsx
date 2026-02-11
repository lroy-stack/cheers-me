'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { POSProvider } from '@/types'

interface POSIntegrationFormProps {
  onSuccess: () => void
  onCancel: () => void
}

const PROVIDER_CONFIGS: Record<POSProvider, { label: string; fields: { key: string; label: string; type: string; placeholder: string }[] }> = {
  square: {
    label: 'Square',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'sq0atp-...' },
      { key: 'location_id', label: 'Location ID', type: 'text', placeholder: 'L...' },
    ],
  },
  sumup: {
    label: 'SumUp',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sup_sk_...' },
      { key: 'merchant_code', label: 'Merchant Code', type: 'text', placeholder: 'M...' },
    ],
  },
  lightspeed: {
    label: 'Lightspeed',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: '' },
      { key: 'account_id', label: 'Account ID', type: 'text', placeholder: '' },
    ],
  },
  toast: {
    label: 'Toast',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', placeholder: '' },
      { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: '' },
      { key: 'restaurant_guid', label: 'Restaurant GUID', type: 'text', placeholder: '' },
    ],
  },
  custom: {
    label: 'Custom',
    fields: [
      { key: 'api_url', label: 'API URL', type: 'text', placeholder: 'https://...' },
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: '' },
    ],
  },
}

export function POSIntegrationForm({ onSuccess, onCancel }: POSIntegrationFormProps) {
  const [provider, setProvider] = useState<POSProvider>('square')
  const [name, setName] = useState('')
  const [config, setConfig] = useState<Record<string, string>>({})
  const [syncCatalog, setSyncCatalog] = useState(true)
  const [syncOrders, setSyncOrders] = useState(true)
  const [syncPayments, setSyncPayments] = useState(true)
  const [syncInventory, setSyncInventory] = useState(false)
  const [saving, setSaving] = useState(false)

  const providerConfig = PROVIDER_CONFIGS[provider]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/settings/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          name: name || providerConfig.label,
          config,
          sync_catalog: syncCatalog,
          sync_orders: syncOrders,
          sync_payments: syncPayments,
          sync_inventory: syncInventory,
        }),
      })

      if (res.ok) {
        onSuccess()
      }
    } catch (err) {
      console.error('Failed to create integration:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New POS Integration</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={(v) => { setProvider(v as POSProvider); setConfig({}) }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROVIDER_CONFIGS).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={providerConfig.label}
              />
            </div>
          </div>

          {/* Dynamic config fields */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Connection Settings</h4>
            {providerConfig.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                <Input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={config[field.key] || ''}
                  onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                />
              </div>
            ))}
          </div>

          {/* Sync toggles */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Sync Options</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label>Sync Catalog</Label>
                <Switch checked={syncCatalog} onCheckedChange={setSyncCatalog} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Sync Orders</Label>
                <Switch checked={syncOrders} onCheckedChange={setSyncOrders} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Sync Payments</Label>
                <Switch checked={syncPayments} onCheckedChange={setSyncPayments} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Sync Inventory</Label>
                <Switch checked={syncInventory} onCheckedChange={setSyncInventory} />
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Create Integration'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
