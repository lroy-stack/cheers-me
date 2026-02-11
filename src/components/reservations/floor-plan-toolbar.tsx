'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Plus, Save, Circle, Square, RectangleHorizontal, QrCode, RefreshCw, FileDown, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from 'next-intl'

interface FloorPlanToolbarProps {
  onAddTable: (shape: 'round' | 'square' | 'rectangle') => void
  onSave: () => void
  onGenerateAllQR?: () => void
  onDownloadQRPDF?: () => void
  isSaving?: boolean
  hasUnsavedChanges?: boolean
  isGeneratingQR?: boolean
  isDownloadingPDF?: boolean
}

export function FloorPlanToolbar({
  onAddTable,
  onSave,
  onGenerateAllQR,
  onDownloadQRPDF,
  isSaving = false,
  hasUnsavedChanges = false,
  isGeneratingQR = false,
  isDownloadingPDF = false,
}: FloorPlanToolbarProps) {
  const t = useTranslations('reservations')
  return (
    <div className="flex items-center justify-between p-4 bg-background border-b">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('floorplan.addTable')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>{t('floorplan.selectTableShape')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAddTable('round')}>
              <Circle className="h-4 w-4 mr-2" />
              {t('floorplan.roundTable')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddTable('square')}>
              <Square className="h-4 w-4 mr-2" />
              {t('floorplan.squareTable')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddTable('rectangle')}>
              <RectangleHorizontal className="h-4 w-4 mr-2" />
              {t('floorplan.rectangleTable')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {hasUnsavedChanges && (
          <Badge variant="secondary" className="ml-2">
            {t('floorplan.unsavedChanges')}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Generate All QRs */}
        {onGenerateAllQR && (
          <Button
            onClick={onGenerateAllQR}
            disabled={isGeneratingQR}
            variant="outline"
            size="sm"
          >
            {isGeneratingQR ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <>
                <QrCode className="h-4 w-4 mr-1" />
                <RefreshCw className="h-3 w-3 mr-2" />
              </>
            )}
            {isGeneratingQR ? t('floorplan.generatingQR') : t('floorplan.generateAllQR')}
          </Button>
        )}

        {/* Download QR PDF */}
        {onDownloadQRPDF && (
          <Button
            onClick={onDownloadQRPDF}
            disabled={isDownloadingPDF}
            variant="outline"
            size="sm"
          >
            {isDownloadingPDF ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            {t('floorplan.downloadQRPDF')}
          </Button>
        )}

        <Button
          onClick={onSave}
          disabled={isSaving || !hasUnsavedChanges}
          variant={hasUnsavedChanges ? 'default' : 'outline'}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? t('floorplan.saving') : t('floorplan.saveLayout')}
        </Button>
      </div>
    </div>
  )
}
