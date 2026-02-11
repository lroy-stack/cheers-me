'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Supplier } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'
import { Plus, Users, Package, TrendingUp } from 'lucide-react'
import { SupplierList } from '@/components/stock/supplier-list'
import { AddSupplierDialog } from '@/components/stock/add-supplier-dialog'
import { EditSupplierDialog } from '@/components/stock/edit-supplier-dialog'
import { SupplierDetailDialog } from '@/components/stock/supplier-detail-dialog'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'

interface SuppliersDashboardProps {
  initialSuppliers: Supplier[]
}

export function SuppliersDashboard({ initialSuppliers }: SuppliersDashboardProps) {
  const t = useTranslations('stock')
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  // Calculate KPIs
  const totalSuppliers = suppliers.length
  const suppliersWithEmail = suppliers.filter((s) => s.email).length
  const suppliersWithPhone = suppliers.filter((s) => s.phone).length

  const handleRefresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name')

    if (error) {
      toast({
        title: t('common.error'),
        description: t('suppliers.failedRefresh'),
        variant: 'destructive',
      })
      return
    }

    setSuppliers(data || [])
  }, [supabase, toast, t])

  const handleEdit = useCallback((supplier: Supplier) => {
    setEditingSupplier(supplier)
    setIsEditDialogOpen(true)
  }, [])

  const handleViewDetails = useCallback((supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setIsDetailDialogOpen(true)
  }, [])

  const handleDelete = useCallback(
    async (supplierId: string) => {
      if (!confirm('Are you sure you want to delete this supplier?')) {
        return
      }

      try {
        const response = await fetch(`/api/stock/suppliers/${supplierId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || t('suppliers.failedDeleteSupplier'))
        }

        toast({
          title: t('common.success'),
          description: t('suppliers.supplierDeleted'),
        })

        await handleRefresh()
      } catch (error) {
        toast({
          title: t('common.error'),
          description: error instanceof Error ? error.message : t('suppliers.failedDeleteSupplier'),
          variant: 'destructive',
        })
      }
    },
    [toast, handleRefresh, t]
  )

  const handleAddSuccess = useCallback(() => {
    setIsAddDialogOpen(false)
    handleRefresh()
    toast({
      title: t('common.success'),
      description: t('suppliers.supplierAdded'),
    })
  }, [handleRefresh, toast, t])

  const handleEditSuccess = useCallback(() => {
    setIsEditDialogOpen(false)
    setEditingSupplier(null)
    handleRefresh()
    toast({
      title: t('common.success'),
      description: t('suppliers.supplierUpdated'),
    })
  }, [handleRefresh, toast, t])

  return (
    <>
      <div className="space-y-6">
        {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('suppliersDashboard.totalSuppliers')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSuppliers}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('suppliersDashboard.activeSuppliers')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('suppliersDashboard.withEmail')}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliersWithEmail}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalSuppliers > 0
                ? `${Math.round((suppliersWithEmail / totalSuppliers) * 100)}%`
                : '0%'}{' '}
              {t('common.ofTotal')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('suppliersDashboard.withPhone')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliersWithPhone}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalSuppliers > 0
                ? `${Math.round((suppliersWithPhone / totalSuppliers) * 100)}%`
                : '0%'}{' '}
              {t('common.ofTotal')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Suppliers List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('suppliersDashboard.title')}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t('suppliersDashboard.description')}
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('suppliers.addSupplier')}
          </Button>
        </CardHeader>
        <CardContent>
          <SupplierList
            suppliers={suppliers}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onViewDetails={handleViewDetails}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddSupplierDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={handleAddSuccess}
      />

      {editingSupplier && (
        <EditSupplierDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          supplier={editingSupplier}
          onSuccess={handleEditSuccess}
        />
      )}

      {selectedSupplier && (
        <SupplierDetailDialog
          open={isDetailDialogOpen}
          onOpenChange={setIsDetailDialogOpen}
          supplier={selectedSupplier}
          onEdit={() => {
            setIsDetailDialogOpen(false)
            handleEdit(selectedSupplier)
          }}
        />
      )}
      </div>
      <Toaster />
    </>
  )
}
