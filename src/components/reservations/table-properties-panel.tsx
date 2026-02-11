'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { Table } from './floor-plan-canvas'
import { Badge } from '@/components/ui/badge'
import { Trash2, RotateCw, QrCode, Download, ExternalLink, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

const tableFormSchema = z.object({
  table_number: z.string().min(1, 'Table number is required').max(50),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
  shape: z.enum(['round', 'square', 'rectangle']),
  status: z.enum(['available', 'occupied', 'reserved', 'cleaning']),
  width: z.coerce.number().min(40).max(300).optional(),
  height: z.coerce.number().min(40).max(300).optional(),
  rotation: z.coerce.number().min(0).max(360).optional(),
  is_active: z.boolean(),
  notes: z.string().max(500).optional(),
})

type TableFormValues = z.infer<typeof tableFormSchema>

interface TablePropertiesPanelProps {
  table: Table | null
  onUpdate: (tableId: string, data: Partial<Table>) => void
  onDelete: (tableId: string) => void
}

export function TablePropertiesPanel({
  table,
  onUpdate,
  onDelete,
}: TablePropertiesPanelProps) {
  const t = useTranslations('reservations')
  const [isGeneratingQr, setIsGeneratingQr] = useState(false)
  const form = useForm<TableFormValues>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: {
      table_number: '',
      capacity: 1,
      shape: 'round',
      status: 'available',
      width: 80,
      height: 80,
      rotation: 0,
      is_active: true,
      notes: '',
    },
    values: table
      ? {
          table_number: table.table_number,
          capacity: table.capacity,
          shape: table.shape,
          status: table.status,
          width: table.width || 80,
          height: table.height || 80,
          rotation: table.rotation || 0,
          is_active: table.is_active,
          notes: (table as unknown as Record<string, unknown>).notes as string || '',
        }
      : undefined,
  })

  const selectedShape = form.watch('shape')

  if (!table) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{t('floorplan.tableProperties')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('floorplan.selectTableToView')}
          </p>
        </CardContent>
      </Card>
    )
  }

  const onSubmit = (data: TableFormValues) => {
    onUpdate(table.id, data)
  }

  const handleDelete = () => {
    if (
      window.confirm(
        t('floorplan.confirmDeleteTable', { number: table.table_number })
      )
    ) {
      onDelete(table.id)
    }
  }

  return (
    <Card className="h-full overflow-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t('overview.table')} {table.table_number}</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="h-8"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {t('overview.delete')}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            onChange={() => {
              // Auto-save on change (with debounce would be better in production)
              const values = form.getValues()
              if (form.formState.isValid) {
                onUpdate(table.id, values)
              }
            }}
          >
            {/* Basic Info */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="table_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('floorplan.tableName')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('floorplan.tableNumberPlaceholder')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('floorplan.capacity')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={1} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('overview.status')}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('overview.status')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="available">{t('floorplan.available')}</SelectItem>
                        <SelectItem value="occupied">{t('floorplan.occupied')}</SelectItem>
                        <SelectItem value="reserved">{t('floorplan.reserved')}</SelectItem>
                        <SelectItem value="cleaning">{t('floorplan.cleaning')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Appearance */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">{t('floorplan.appearance')}</h4>

              <FormField
                control={form.control}
                name="shape"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('floorplan.shape')}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('floorplan.selectShape')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="round">{t('floorplan.shapeRound')}</SelectItem>
                        <SelectItem value="square">{t('floorplan.shapeSquare')}</SelectItem>
                        <SelectItem value="rectangle">{t('floorplan.shapeRectangle')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {selectedShape === 'rectangle' ? t('floorplan.widthPx') : t('floorplan.sizePx')}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={40} max={300} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedShape === 'rectangle' && (
                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('floorplan.heightPx')}</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min={40} max={300} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="rotation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">
                      <span>{t('floorplan.rotationDegrees')}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => form.setValue('rotation', 0)}
                        className="h-7 text-xs"
                      >
                        <RotateCw className="h-3 w-3 mr-1" />
                        {t('floorplan.reset')}
                      </Button>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={0} max={360} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Other Settings */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>{t('floorplan.active')}</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('floorplan.notes')}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t('floorplan.notesPlaceholder')}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Position Info (read-only) */}
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t('floorplan.position')}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">X: </span>
                  {Math.round(table.x_position)}px
                </div>
                <div>
                  <span className="text-muted-foreground">Y: </span>
                  {Math.round(table.y_position)}px
                </div>
              </div>
            </div>

            {/* QR Code Section */}
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                QR Code
              </h4>

              {(() => {
                const qrImageUrl = `/api/tables/${table.id}/qr-image`
                const qrGenAt = (table as unknown as Record<string, unknown>).qr_generated_at as string | null

                // Compute version badge
                let versionBadge = null
                if (qrGenAt) {
                  const hoursSince = (Date.now() - new Date(qrGenAt).getTime()) / (1000 * 60 * 60)
                  if (hoursSince < 24) {
                    versionBadge = <Badge className="bg-green-500 text-white text-[10px]">New</Badge>
                  } else if (hoursSince < 168) { // 7 days
                    versionBadge = <Badge className="bg-blue-500 text-white text-[10px]">Updated</Badge>
                  } else {
                    versionBadge = <Badge variant="outline" className="text-[10px]">{new Date(qrGenAt).toLocaleDateString()}</Badge>
                  }
                }

                return table.qr_code_url ? (
                  <div className="space-y-3">
                    {/* QR Preview - styled with logo */}
                    <div className="flex flex-col items-center gap-2 p-3 bg-card rounded-lg border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrImageUrl}
                        alt={`QR Code - ${table.table_number}`}
                        width={150}
                        height={150}
                      />
                      {versionBadge && (
                        <div className="flex items-center gap-1">
                          {versionBadge}
                          {qrGenAt && (
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(qrGenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={async () => {
                          const res = await fetch(qrImageUrl)
                          const blob = await res.blob()
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `qr-${table.table_number}.png`
                          a.click()
                          URL.revokeObjectURL(url)
                        }}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(`/menu/digital?table=${table.table_number}`, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                    </div>

                    {/* Regenerate */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      disabled={isGeneratingQr}
                      onClick={async () => {
                        setIsGeneratingQr(true)
                        try {
                          const res = await fetch('/api/tables/qr-code', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ table_id: table.id }),
                          })
                          const data = await res.json()
                          if (data.success) {
                            onUpdate(table.id, { qr_code_url: data.qr_code_url })
                          }
                        } finally {
                          setIsGeneratingQr(false)
                        }
                      }}
                    >
                      {isGeneratingQr ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <QrCode className="h-3 w-3 mr-1" />
                      )}
                      Regenerate QR
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      No QR code generated yet. Generate one to link this table to the digital menu.
                    </p>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="w-full"
                      disabled={isGeneratingQr}
                      onClick={async () => {
                        setIsGeneratingQr(true)
                        try {
                          const res = await fetch('/api/tables/qr-code', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ table_id: table.id }),
                          })
                          const data = await res.json()
                          if (data.success) {
                            onUpdate(table.id, { qr_code_url: data.qr_code_url })
                          }
                        } finally {
                          setIsGeneratingQr(false)
                        }
                      }}
                    >
                      {isGeneratingQr ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <QrCode className="h-4 w-4 mr-2" />
                      )}
                      Generate QR Code
                    </Button>
                  </div>
                )
              })()}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
