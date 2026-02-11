'use client'

import type { POSIntegration } from '@/types'
import { CheckCircle2, XCircle, Clock, Package, CreditCard, ShoppingCart } from 'lucide-react'

interface POSSyncStatusProps {
  integration: POSIntegration
}

export function POSSyncStatus({ integration }: POSSyncStatusProps) {
  const syncFeatures = [
    { key: 'sync_catalog', label: 'Catalog', icon: Package, enabled: integration.sync_catalog },
    { key: 'sync_orders', label: 'Orders', icon: ShoppingCart, enabled: integration.sync_orders },
    { key: 'sync_payments', label: 'Payments', icon: CreditCard, enabled: integration.sync_payments },
    { key: 'sync_inventory', label: 'Inventory', icon: Package, enabled: integration.sync_inventory },
  ]

  return (
    <div className="space-y-3">
      {/* Sync features grid */}
      <div className="grid grid-cols-4 gap-2">
        {syncFeatures.map((feature) => {
          const Icon = feature.icon
          return (
            <div
              key={feature.key}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg text-center ${
                feature.enabled
                  ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs font-medium">{feature.label}</span>
              {feature.enabled ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
            </div>
          )
        })}
      </div>

      {/* Last sync info */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-3 w-3" />
        {integration.last_sync_at ? (
          <span>Last synced: {new Date(integration.last_sync_at).toLocaleString()}</span>
        ) : (
          <span>Never synced</span>
        )}
      </div>

      {/* Error display */}
      {integration.last_error && (
        <div className="p-2 rounded bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm">
          {integration.last_error}
        </div>
      )}
    </div>
  )
}
