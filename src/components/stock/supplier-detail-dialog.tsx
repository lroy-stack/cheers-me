'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Supplier, Product } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Mail,
  MapPin,
  CreditCard,
  Package,
  Pencil,
  FileText,
} from 'lucide-react'

interface SupplierDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: Supplier
  onEdit: () => void
}

interface SupplierWithProducts extends Supplier {
  products: Product[]
}

export function SupplierDetailDialog({
  open,
  onOpenChange,
  supplier,
  onEdit,
}: SupplierDetailDialogProps) {
  const t = useTranslations('stock')
  const [supplierDetails, setSupplierDetails] = useState<SupplierWithProducts | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchSupplierDetails = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/stock/suppliers/${supplier.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch supplier details')
      }
      const data = await response.json()
      setSupplierDetails(data)
    } catch (error) {
      console.error('Error fetching supplier details:', error)
    } finally {
      setIsLoading(false)
    }
  }, [supplier.id])

  useEffect(() => {
    if (open) {
      fetchSupplierDetails()
    }
  }, [open, fetchSupplierDetails])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{supplier.name}</DialogTitle>
          <DialogDescription>{t('dialogs.supplierDetails')}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-48" />
          </div>
        ) : (
          supplierDetails && (
            <div className="space-y-6">
              {/* Contact Information */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {t('suppliers.contact')}
                  </h3>
                  <div className="grid gap-3">
                    {supplierDetails.contact_person && (
                      <div className="flex items-start gap-3">
                        <div className="text-sm font-medium text-muted-foreground min-w-[120px]">
                          {t('suppliers.contact')}:
                        </div>
                        <div className="text-sm">{supplierDetails.contact_person}</div>
                      </div>
                    )}
                    {supplierDetails.email && (
                      <div className="flex items-start gap-3">
                        <div className="text-sm font-medium text-muted-foreground min-w-[120px]">
                          {t('suppliers.email')}:
                        </div>
                        <a
                          href={`mailto:${supplierDetails.email}`}
                          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {supplierDetails.email}
                        </a>
                      </div>
                    )}
                    {supplierDetails.phone && (
                      <div className="flex items-start gap-3">
                        <div className="text-sm font-medium text-muted-foreground min-w-[120px]">
                          {t('suppliers.phone')}:
                        </div>
                        <a
                          href={`tel:${supplierDetails.phone}`}
                          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {supplierDetails.phone}
                        </a>
                      </div>
                    )}
                    {supplierDetails.address && (
                      <div className="flex items-start gap-3">
                        <div className="text-sm font-medium text-muted-foreground min-w-[120px]">
                          <MapPin className="h-3 w-3 inline mr-1" />
                          {t('suppliers.address')}:
                        </div>
                        <div className="text-sm whitespace-pre-wrap">
                          {supplierDetails.address}
                        </div>
                      </div>
                    )}
                    {supplierDetails.payment_terms && (
                      <div className="flex items-start gap-3">
                        <div className="text-sm font-medium text-muted-foreground min-w-[120px]">
                          <CreditCard className="h-3 w-3 inline mr-1" />
                          {t('dialogs.paymentTerms')}:
                        </div>
                        <Badge variant="outline">{supplierDetails.payment_terms}</Badge>
                      </div>
                    )}
                  </div>
                  {supplierDetails.notes && (
                    <>
                      <Separator className="my-4" />
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <FileText className="h-3 w-3" />
                          {t('suppliers.notes')}
                        </div>
                        <div className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                          {supplierDetails.notes}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Associated Products */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {t('dialogs.associatedProducts')}
                    <Badge variant="secondary" className="ml-auto">
                      {supplierDetails.products.length}
                    </Badge>
                  </h3>
                  {supplierDetails.products.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      {t('dialogs.noAssociatedProducts')}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {supplierDetails.products.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{product.name}</div>
                            <div className="text-xs text-muted-foreground capitalize">
                              {product.category} • {product.current_stock} {product.unit}
                              {product.min_stock !== null &&
                                ` • ${t('inventory.minStock')}: ${product.min_stock}`}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{'\u20ac'}{product.cost_per_unit.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">{t('common.perUnit', { unit: product.unit })}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
          <Button onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            {t('suppliers.editSupplier')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
