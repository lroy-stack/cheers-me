'use client'

import { useEffect, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  UtensilsCrossed,
  Plus,
  Edit,
  Eye,
  EyeOff,
  TrendingUp,
  ChefHat,
  Pencil,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'
import { CategoryFormDialog } from '@/components/menu/category-form-dialog'

interface CategoryStats {
  id: string
  name_en: string
  name_nl?: string
  name_es?: string
  name_de?: string
  sort_order: number
  total_items: number
  available_items: number
  avg_price: number
  avg_margin: number
}

async function fetchMenuStats(): Promise<CategoryStats[]> {
  const [categoriesRes, itemsRes] = await Promise.all([
    fetch('/api/menu/categories'),
    fetch('/api/menu/items'),
  ])

  if (!categoriesRes.ok || !itemsRes.ok) {
    throw new Error('Failed to fetch data')
  }

  const categories = await categoriesRes.json()
  const items = await itemsRes.json()

  const stats = categories.map((category: CategoryStats) => {
    const categoryItems = items.filter((item: { category_id: string }) => item.category_id === category.id)
    const availableItems = categoryItems.filter((item: { available: boolean }) => item.available)

    const avgPrice =
      categoryItems.length > 0
        ? categoryItems.reduce((sum: number, item: { price: number }) => sum + item.price, 0) /
          categoryItems.length
        : 0

    const itemsWithMargin = categoryItems.filter(
      (item: { price: number; cost_of_goods?: number }) => item.price && item.cost_of_goods
    )
    const avgMargin =
      itemsWithMargin.length > 0
        ? itemsWithMargin.reduce(
            (sum: number, item: { price: number; cost_of_goods: number }) =>
              sum + ((item.price - item.cost_of_goods) / item.price) * 100,
            0
          ) / itemsWithMargin.length
        : 0

    return {
      ...category,
      total_items: categoryItems.length,
      available_items: availableItems.length,
      avg_price: avgPrice,
      avg_margin: avgMargin,
    }
  })

  return stats.sort((a: CategoryStats, b: CategoryStats) => a.sort_order - b.sort_order)
}

export default function MenuOverviewPage() {
  const { toast } = useToast()
  const t = useTranslations('menu')
  const { mutate } = useSWRConfig()

  const { data: categoryStats = [], isLoading, error } = useSWR<CategoryStats[]>(
    'menu-stats',
    fetchMenuStats,
    { dedupingInterval: 30000 }
  )

  // Category form dialog state
  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryStats | undefined>()

  // Delete dialog state
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load menu statistics',
        variant: 'destructive',
      })
    }
  }, [error, toast])

  function handleOpenCreate() {
    setEditingCategory(undefined)
    setFormOpen(true)
  }

  function handleOpenEdit(category: CategoryStats) {
    setEditingCategory(category)
    setFormOpen(true)
  }

  function handleFormSuccess() {
    mutate('menu-stats')
  }

  async function handleDelete() {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/menu/categories/${deleteId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        if (res.status === 400) {
          toast({
            title: t('overview.deleteCategory'),
            description: t('overview.deleteHasItems'),
            variant: 'destructive',
          })
        } else {
          throw new Error(data.error || 'Delete failed')
        }
        return
      }
      toast({ title: t('overview.categoryDeleted') })
      mutate('menu-stats')
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UtensilsCrossed className="h-6 w-6" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground">
            {t('overview.manageDesc')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t('overview.addCategory')}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/menu/builder">
              <Edit className="mr-2 h-4 w-4" />
              {t('builder.title')}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/menu/kitchen">
              <ChefHat className="mr-2 h-4 w-4" />
              {t('kitchen.title')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('overview.totalItems')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categoryStats.reduce((sum, cat) => sum + cat.total_items, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('builder.available')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {categoryStats.reduce((sum, cat) => sum + cat.available_items, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('overview.avgPrice')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €
              {(
                categoryStats.reduce((sum, cat) => sum + cat.avg_price, 0) /
                  categoryStats.length || 0
              ).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('overview.avgMargin')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {(
                categoryStats.reduce((sum, cat) => sum + cat.avg_margin, 0) /
                  categoryStats.length || 0
              ).toFixed(0)}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categoryStats.map((category) => {
          const marginColor =
            category.avg_margin >= 70
              ? 'text-green-600'
              : category.avg_margin >= 50
              ? 'text-primary'
              : 'text-red-600'

          return (
            <Card key={category.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{category.name_en}</CardTitle>
                    <CardDescription className="mt-1">
                      {category.name_nl && `${category.name_nl} • `}
                      {category.name_es}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenEdit(category)}
                      title={t('overview.editCategory')}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(category.id)}
                      title={t('overview.deleteCategory')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Badge variant="secondary" className="text-lg ml-1">
                      {category.total_items}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Eye className="h-4 w-4" />
                      {t('builder.available')}
                    </div>
                    <div className="text-lg font-semibold text-green-600">
                      {category.available_items}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <EyeOff className="h-4 w-4" />
                      {t('overview.unavailable')}
                    </div>
                    <div className="text-lg font-semibold text-muted-foreground">
                      {category.total_items - category.available_items}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('overview.avgPrice')}</span>
                    <span className="font-semibold">€{category.avg_price.toFixed(2)}</span>
                  </div>
                  {category.avg_margin > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {t('overview.avgMargin')}
                      </span>
                      <span className={`font-semibold ${marginColor}`}>
                        {category.avg_margin.toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>

                <Button asChild variant="outline" className="w-full">
                  <Link href={`/menu/builder?category=${category.id}`}>
                    {t('overview.viewItems')}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {categoryStats.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UtensilsCrossed className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('overview.noCategories')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('overview.getStarted')}
            </p>
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {t('overview.addCategory')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Category Form Dialog */}
      <CategoryFormDialog
        key={editingCategory?.id ?? 'new'}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleFormSuccess}
        category={editingCategory}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('overview.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('overview.confirmDeleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('overview.deleteCategory')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
