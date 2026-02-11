'use client'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { AllergenSelector } from './allergen-selector'
import { MenuImageUpload } from './menu-image-upload'
import { type AllergenType } from '@/lib/constants/allergens'
import { ImagePlus, Loader2, DollarSign, Clock, Euro, Upload } from 'lucide-react'
import { useState, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const menuItemSchema = z.object({
  category_id: z.string().uuid('Please select a category'),
  name_en: z.string().min(2, 'Name must be at least 2 characters'),
  name_nl: z.string().optional(),
  name_es: z.string().optional(),
  description_en: z.string().optional(),
  description_nl: z.string().optional(),
  description_es: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  cost_of_goods: z.number().min(0, 'Cost must be positive').optional(),
  photo_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  prep_time_minutes: z.number().int().min(0, 'Prep time must be positive').optional(),
  available: z.boolean().default(true),
  sort_order: z.number().int().min(0).optional(),
  allergens: z.array(z.string()).optional(),
})

export type MenuItemFormValues = z.infer<typeof menuItemSchema>

interface MenuItemFormProps {
  onSubmit: (values: MenuItemFormValues, pendingImage?: File) => Promise<void>
  onCancel: () => void
  defaultValues?: Partial<MenuItemFormValues>
  menuItemId?: string
  categories: Array<{
    id: string
    name_en: string
    name_nl?: string
    name_es?: string
  }>
}

export function MenuItemForm({
  onSubmit,
  onCancel,
  defaultValues,
  menuItemId,
  categories,
}: MenuItemFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'nl' | 'es'>('en')
  const [imageMode, setImageMode] = useState<'upload' | 'url'>(menuItemId ? 'upload' : 'url')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const pendingFileInputRef = useRef<HTMLInputElement>(null)
  const t = useTranslations('menu')

  const handlePendingFile = useCallback((file: File) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return
    if (file.size > MAX_FILE_SIZE) return
    setPendingFile(file)
    setPendingPreview(URL.createObjectURL(file))
  }, [])

  const form = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      available: true,
      sort_order: 0,
      allergens: [],
      ...defaultValues,
    },
  })

  const handleSubmit = async (values: MenuItemFormValues) => {
    setIsSubmitting(true)
    try {
      await onSubmit(values, pendingFile || undefined)
    } finally {
      setIsSubmitting(false)
    }
  }

  const price = form.watch('price')
  const costOfGoods = form.watch('cost_of_goods')
  const margin =
    price && costOfGoods
      ? (((price - costOfGoods) / price) * 100).toFixed(1)
      : null

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('builder.category')} *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('items.selectCategory')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="available"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">{t('builder.available')}</FormLabel>
                  <FormDescription>
                    {t('items.displayOnMenu')}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Multi-language Name & Description */}
        <Tabs value={currentLanguage} onValueChange={(v) => setCurrentLanguage(v as 'en' | 'nl' | 'es')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="en">{t('builder.english')}</TabsTrigger>
            <TabsTrigger value="nl">{t('builder.dutch')}</TabsTrigger>
            <TabsTrigger value="es">{t('builder.spanish')}</TabsTrigger>
          </TabsList>

          <TabsContent value="en" className="space-y-4">
            <FormField
              control={form.control}
              name="name_en"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('items.nameEn')} *</FormLabel>
                  <FormControl>
                    <Input placeholder={t('items.namePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description_en"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('items.descriptionEn')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('items.descriptionPlaceholder')}
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="nl" className="space-y-4">
            <FormField
              control={form.control}
              name="name_nl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('items.nameNl')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('items.namePlaceholderNl')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description_nl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('items.descriptionNl')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('items.descriptionPlaceholderNl')}
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="es" className="space-y-4">
            <FormField
              control={form.control}
              name="name_es"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('items.nameEs')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('items.namePlaceholderEs')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description_es"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('items.descriptionEs')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('items.descriptionPlaceholderEs')}
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>

        {/* Pricing & Cost */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('builder.price')} (€) *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Euro className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-10"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cost_of_goods"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('items.cost')}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-10"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) =>
                        field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                      }
                    />
                  </div>
                </FormControl>
                <FormDescription>{t('items.ingredientCost')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">{t('items.margin')}</label>
            <div className="h-10 rounded-md border bg-muted flex items-center justify-center font-semibold">
              {margin ? `${margin}%` : '—'}
            </div>
            <p className="text-[0.8rem] text-muted-foreground">{t('items.profitMargin')}</p>
          </div>
        </div>

        {/* Prep Time */}
        <FormField
          control={form.control}
          name="prep_time_minutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('items.prepTime')}</FormLabel>
              <FormControl>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="15"
                    className="pl-10"
                    {...field}
                    value={field.value || ''}
                    onChange={(e) =>
                      field.onChange(e.target.value ? parseInt(e.target.value) : undefined)
                    }
                  />
                </div>
              </FormControl>
              <FormDescription>
                {t('items.prepTimeDesc')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Allergens */}
        <FormField
          control={form.control}
          name="allergens"
          render={({ field }) => (
            <FormItem>
              <AllergenSelector
                value={(field.value as AllergenType[]) || []}
                onChange={field.onChange}
                language={currentLanguage}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Photo */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium leading-none">{t('builder.image')}</label>
            {menuItemId && (
              <div className="flex border rounded-md overflow-hidden text-xs">
                <button
                  type="button"
                  className={`px-3 py-1 transition-colors ${imageMode === 'upload' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                  onClick={() => setImageMode('upload')}
                >
                  Upload
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 transition-colors ${imageMode === 'url' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                  onClick={() => setImageMode('url')}
                >
                  URL
                </button>
              </div>
            )}
          </div>

          {imageMode === 'upload' && menuItemId ? (
            <MenuImageUpload
              menuItemId={menuItemId}
              currentImageUrl={form.watch('photo_url') || null}
              onImageChange={(url) => form.setValue('photo_url', url || '')}
            />
          ) : !menuItemId ? (
            /* Create mode: select image file to upload after save */
            <div className="space-y-3">
              {pendingPreview ? (
                <div className="relative group">
                  <div className="relative h-48 rounded-lg overflow-hidden border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pendingPreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    className="absolute top-2 right-2 px-2 py-1 rounded bg-destructive text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => { setPendingFile(null); setPendingPreview(null) }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const file = e.dataTransfer.files[0]
                    if (file) handlePendingFile(file)
                  }}
                  className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer border-muted-foreground/25 hover:border-primary/50"
                  onClick={() => pendingFileInputRef.current?.click()}
                >
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      {t('items.dropImageOrClick')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPEG, PNG, WebP — Max 5MB
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('items.imageUploadedAfterSave')}
                    </p>
                  </div>
                </div>
              )}
              <input
                ref={pendingFileInputRef}
                type="file"
                accept={ALLOWED_IMAGE_TYPES.join(',')}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handlePendingFile(file)
                  if (pendingFileInputRef.current) pendingFileInputRef.current.value = ''
                }}
                className="hidden"
              />
            </div>
          ) : (
            <FormField
              control={form.control}
              name="photo_url"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <ImagePlus className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="https://..."
                        className="pl-10"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    {t('items.imageUrlHint')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Sort Order */}
        <FormField
          control={form.control}
          name="sort_order"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('items.sortOrder')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0"
                  {...field}
                  value={field.value || 0}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                />
              </FormControl>
              <FormDescription>
                {t('items.sortOrderHint')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('items.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {defaultValues ? t('items.updateItem') : t('items.createItem')}
          </Button>
        </div>
      </form>
    </Form>
  )
}
