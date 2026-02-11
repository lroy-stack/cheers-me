'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { MenuItemCard, type MenuItem } from '@/components/menu/menu-item-card'
import { MenuItemForm, type MenuItemFormValues } from '@/components/menu/menu-item-form'
import { Plus, Search, Grid3x3, List, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useTranslations } from 'next-intl'

interface Category {
  id: string
  name_en: string
  name_nl?: string
  name_es?: string
  sort_order: number
}

export default function MenuBuilderPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [language, setLanguage] = useState<'en' | 'nl' | 'es'>('en')
  const { toast } = useToast()
  const t = useTranslations('menu')

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/menu/categories')
        if (!response.ok) throw new Error('Failed to fetch categories')
        const data = await response.json()
        setCategories(data.sort((a: Category, b: Category) => a.sort_order - b.sort_order))
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load categories',
          variant: 'destructive',
        })
      }
    }
    fetchCategories()
  }, [toast])

  // Fetch menu items
  useEffect(() => {
    async function fetchMenuItems() {
      setIsLoading(true)
      try {
        const response = await fetch('/api/menu/items?include_allergens=true')
        if (!response.ok) throw new Error('Failed to fetch menu items')
        const data = await response.json()
        setMenuItems(data)
        setFilteredItems(data)
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load menu items',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }
    fetchMenuItems()
  }, [toast])

  // Filter items
  useEffect(() => {
    let filtered = menuItems

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((item) => item.category_id === selectedCategory)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.name_en.toLowerCase().includes(query) ||
          item.name_nl?.toLowerCase().includes(query) ||
          item.name_es?.toLowerCase().includes(query) ||
          item.description_en?.toLowerCase().includes(query)
      )
    }

    setFilteredItems(filtered)
  }, [menuItems, selectedCategory, searchQuery])

  const handleCreateItem = async (values: MenuItemFormValues) => {
    try {
      const response = await fetch('/api/menu/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create menu item')
      }

      const newItem = await response.json()
      setMenuItems([...menuItems, newItem])
      setIsSheetOpen(false)
      toast({
        title: 'Success',
        description: 'Menu item created successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create menu item',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleUpdateItem = async (values: MenuItemFormValues) => {
    if (!editingItem) return

    try {
      const response = await fetch(`/api/menu/items/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update menu item')
      }

      const updatedItem = await response.json()
      setMenuItems(menuItems.map((item) => (item.id === updatedItem.id ? updatedItem : item)))
      setIsSheetOpen(false)
      setEditingItem(null)
      toast({
        title: 'Success',
        description: 'Menu item updated successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update menu item',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleDeleteItem = async (item: MenuItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name_en}"?`)) return

    try {
      const response = await fetch(`/api/menu/items/${item.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete menu item')

      setMenuItems(menuItems.filter((i) => i.id !== item.id))
      toast({
        title: 'Success',
        description: 'Menu item deleted successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete menu item',
        variant: 'destructive',
      })
    }
  }

  const handleDuplicateItem = (item: MenuItem) => {
    setEditingItem({
      ...item,
      id: '',
      name_en: `${item.name_en} (Copy)`,
      name_nl: item.name_nl ? `${item.name_nl} (Kopie)` : undefined,
      name_es: item.name_es ? `${item.name_es} (Copia)` : undefined,
    })
    setIsSheetOpen(true)
  }

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      const response = await fetch(`/api/menu/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: !item.available }),
      })

      if (!response.ok) throw new Error('Failed to update availability')

      const updatedItem = await response.json()
      setMenuItems(menuItems.map((i) => (i.id === updatedItem.id ? updatedItem : i)))
      toast({
        title: 'Success',
        description: `Item marked as ${updatedItem.available ? 'available' : 'unavailable'}`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update availability',
        variant: 'destructive',
      })
    }
  }

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item)
    setIsSheetOpen(true)
  }

  const handleCloseSheet = () => {
    setIsSheetOpen(false)
    setEditingItem(null)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('builder.title')}</h1>
          <p className="text-muted-foreground">
            {t('builder.subtitle')}
          </p>
        </div>
        <Button onClick={() => setIsSheetOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> {t('overview.addItem')}
        </Button>
      </div>

      {/* Filters & Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('builder.searchPlaceholder')}
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder={t('builder.allCategories')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('overview.categories')}</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category[`name_${language}`] || category.name_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={language} onValueChange={(v) => setLanguage(v as 'en' | 'nl' | 'es')}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">{t('builder.english')}</SelectItem>
            <SelectItem value="nl">{t('builder.dutch')}</SelectItem>
            <SelectItem value="es">{t('builder.spanish')}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Items Grid/List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredItems.length === 0 ? (
        <Alert>
          <AlertDescription>
            {searchQuery || selectedCategory !== 'all'
              ? t('builder.noItemsMatch')
              : t('builder.noItemsYet')}
          </AlertDescription>
        </Alert>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              onEdit={handleEditItem}
              onDelete={handleDeleteItem}
              onDuplicate={handleDuplicateItem}
              onToggleAvailability={handleToggleAvailability}
              language={language}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {filteredItems.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              onEdit={handleEditItem}
              onDelete={handleDeleteItem}
              onDuplicate={handleDuplicateItem}
              onToggleAvailability={handleToggleAvailability}
              language={language}
              compact
            />
          ))}
        </div>
      )}

      {/* Create/Edit Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={handleCloseSheet}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingItem?.id ? t('builder.editMenuItem') : t('builder.createMenuItem')}
            </SheetTitle>
            <SheetDescription>
              {t('builder.fillDetails')}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <MenuItemForm
              onSubmit={editingItem?.id ? handleUpdateItem : handleCreateItem}
              onCancel={handleCloseSheet}
              defaultValues={
                editingItem
                  ? {
                      category_id: editingItem.category_id,
                      name_en: editingItem.name_en,
                      name_nl: editingItem.name_nl,
                      name_es: editingItem.name_es,
                      description_en: editingItem.description_en,
                      description_nl: editingItem.description_nl,
                      description_es: editingItem.description_es,
                      price: editingItem.price,
                      cost_of_goods: editingItem.cost_of_goods,
                      photo_url: editingItem.photo_url,
                      prep_time_minutes: editingItem.prep_time_minutes,
                      available: editingItem.available,
                      sort_order: editingItem.sort_order,
                      allergens: editingItem.allergens,
                    }
                  : undefined
              }
              categories={categories}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
