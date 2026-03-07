'use client'

import { useState } from 'react'
import { useCoupons } from '@/hooks/use-coupons'
import { useTranslations } from 'next-intl'
import { formatCouponAmount } from '@/lib/utils/coupon-code'
import CouponStatsCards from './coupon-stats-cards'
import CouponDetailDialog from './coupon-detail-dialog'
import { Loader2, Search, Download } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

const statusColors: Record<string, string> = {
  pending_payment: 'bg-muted text-muted-foreground',
  active: 'bg-success/15 text-success',
  partially_used: 'bg-amber-100 text-amber-700',
  fully_used: 'bg-blue-100 text-blue-700',
  expired: 'bg-destructive/15 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
}

export default function CouponList() {
  const t = useTranslations('coupons')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { coupons, stats, loading } = useCoupons({
    status: statusFilter || undefined,
    search: search || undefined,
  })

  return (
    <div className="space-y-4">
      <CouponStatsCards stats={stats} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('filters.search')}
            className="w-full pl-9 pr-3 py-1.5 rounded-md border border-border bg-background text-sm"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-md border border-border bg-background text-sm"
        >
          <option value="">{t('filters.allStatuses')}</option>
          {['active', 'partially_used', 'fully_used', 'expired', 'cancelled', 'pending_payment'].map(s => (
            <option key={s} value={s}>{t(`status.${s}`)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">{t('noCoupons')}</p>
          <p className="text-sm mt-1">{t('noCouponsDescription')}</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="w-full text-sm">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-left px-4 py-2 font-medium">{t('detail.couponCode')}</TableHead>
                  <TableHead className="text-left px-4 py-2 font-medium">{t('detail.amount')}</TableHead>
                  <TableHead className="text-left px-4 py-2 font-medium">{t('detail.remaining')}</TableHead>
                  <TableHead className="text-left px-4 py-2 font-medium">{t('detail.purchaser')}</TableHead>
                  <TableHead className="text-left px-4 py-2 font-medium">Status</TableHead>
                  <TableHead className="text-left px-4 py-2 font-medium">{t('detail.purchasedAt')}</TableHead>
                  <TableHead className="px-4 py-2"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {coupons.map(c => (
                  <TableRow
                    key={c.id}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedId(c.id)}
                  >
                    <TableCell className="px-4 py-2 font-mono font-bold">{c.code}</TableCell>
                    <TableCell className="px-4 py-2">{formatCouponAmount(c.amount_cents)}</TableCell>
                    <TableCell className="px-4 py-2">{formatCouponAmount(c.remaining_cents)}</TableCell>
                    <TableCell className="px-4 py-2">{c.purchaser_name}</TableCell>
                    <TableCell className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status]}`}>
                        {t(`status.${c.status}`)}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-2 text-muted-foreground">
                      {c.purchased_at ? new Date(c.purchased_at).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      {c.pdf_url && (
                        <a
                          href={c.pdf_url}
                          target="_blank"
                          rel="noopener"
                          onClick={e => e.stopPropagation()}
                          className="text-primary hover:text-primary/80"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {selectedId && (
        <CouponDetailDialog couponId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}
