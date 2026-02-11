'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FloorPlanCanvas } from '@/components/reservations/floor-plan-canvas'
import { FloorSectionTabs } from '@/components/reservations/floor-section-tabs'
import { TablePropertiesPanel } from '@/components/reservations/table-properties-panel'
import { FloorPlanToolbar } from '@/components/reservations/floor-plan-toolbar'
import type { Table } from '@/components/reservations/floor-plan-canvas'
import type { FloorSection } from '@/components/reservations/floor-section-tabs'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslations } from 'next-intl'

export default function FloorPlanEditorPage() {
  const t = useTranslations('reservations')
  const [tables, setTables] = useState<Table[]>([])
  const [sections, setSections] = useState<FloorSection[]>([])
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false)

  const supabase = createClient()
  const { toast } = useToast()

  // Fetch floor sections
  const fetchSections = useCallback(async () => {
    const { data, error } = await supabase
      .from('floor_sections')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      toast({
        title: 'Error loading sections',
        description: error.message,
        variant: 'destructive',
      })
      return
    }

    setSections(data || [])

    // Set first active section as default
    const firstActiveSection = data?.find((s) => s.is_active)
    if (firstActiveSection && !activeSection) {
      setActiveSection(firstActiveSection.id)
    }
  }, [supabase, toast, activeSection])

  // Fetch tables for active section
  const fetchTables = useCallback(async () => {
    if (!activeSection) return

    setIsLoading(true)

    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('section_id', activeSection)
      .order('table_number', { ascending: true })

    if (error) {
      toast({
        title: 'Error loading tables',
        description: error.message,
        variant: 'destructive',
      })
      setIsLoading(false)
      return
    }

    const tablesData = (data || []).map((t) => ({
      id: t.id,
      table_number: t.table_number,
      capacity: t.capacity,
      x_position: t.x_position || 0,
      y_position: t.y_position || 0,
      status: t.status as Table['status'],
      shape: t.shape as Table['shape'],
      width: t.width || 80,
      height: t.height || 80,
      rotation: t.rotation || 0,
      section_id: t.section_id,
      is_active: t.is_active ?? true,
      qr_code_url: t.qr_code_url || null,
    }))

    setTables(tablesData)
    setIsLoading(false)
    setHasUnsavedChanges(false)
  }, [activeSection, supabase, toast])

  useEffect(() => {
    fetchSections()
  }, [fetchSections])

  useEffect(() => {
    if (activeSection) {
      fetchTables()
      setSelectedTable(null) // Deselect when switching sections
    }
  }, [activeSection, fetchTables])

  // Handle table movement
  const handleTableMove = useCallback((tableId: string, x: number, y: number) => {
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, x_position: x, y_position: y } : t))
    )
    setHasUnsavedChanges(true)
  }, [])

  // Handle table selection
  const handleTableSelect = useCallback((table: Table | null) => {
    setSelectedTable(table)
  }, [])

  // Handle table update (from properties panel)
  const handleTableUpdate = useCallback(
    (tableId: string, data: Partial<Table>) => {
      setTables((prev) =>
        prev.map((t) => (t.id === tableId ? { ...t, ...data } : t))
      )
      setHasUnsavedChanges(true)

      // Update selected table if it's the one being edited
      if (selectedTable?.id === tableId) {
        setSelectedTable((prev) => (prev ? { ...prev, ...data } : null))
      }
    },
    [selectedTable]
  )

  // Handle table deletion
  const handleTableDelete = useCallback(
    async (tableId: string) => {
      const { error } = await supabase.from('tables').delete().eq('id', tableId)

      if (error) {
        toast({
          title: 'Error deleting table',
          description: error.message,
          variant: 'destructive',
        })
        return
      }

      setTables((prev) => prev.filter((t) => t.id !== tableId))
      setSelectedTable(null)
      setHasUnsavedChanges(false)

      toast({
        title: 'Table deleted',
        description: 'The table has been removed from the floor plan.',
      })
    },
    [supabase, toast]
  )

  // Handle adding new table
  const handleAddTable = useCallback(
    async (shape: 'round' | 'square' | 'rectangle') => {
      if (!activeSection) {
        toast({
          title: 'No section selected',
          description: 'Please select a floor section first.',
          variant: 'destructive',
        })
        return
      }

      // Generate next table number
      const maxNumber = tables.reduce((max, t) => {
        const num = parseInt(t.table_number.replace(/\D/g, ''), 10)
        return isNaN(num) ? max : Math.max(max, num)
      }, 0)
      const newTableNumber = `T${maxNumber + 1}`

      const newTableData = {
        table_number: newTableNumber,
        capacity: 4,
        section_id: activeSection,
        x_position: 50,
        y_position: 50,
        status: 'available' as const,
        shape,
        width: 80,
        height: shape === 'rectangle' ? 120 : 80,
        rotation: 0,
        is_active: true,
      }

      const { data, error } = await supabase
        .from('tables')
        .insert(newTableData)
        .select()
        .single()

      if (error) {
        toast({
          title: 'Error creating table',
          description: error.message,
          variant: 'destructive',
        })
        return
      }

      const newTable: Table = {
        id: data.id,
        table_number: data.table_number,
        capacity: data.capacity,
        x_position: data.x_position || 0,
        y_position: data.y_position || 0,
        status: data.status as Table['status'],
        shape: data.shape as Table['shape'],
        width: data.width || 80,
        height: data.height || 80,
        rotation: data.rotation || 0,
        section_id: data.section_id,
        is_active: data.is_active ?? true,
        qr_code_url: data.qr_code_url || null,
      }

      setTables((prev) => [...prev, newTable])
      setSelectedTable(newTable)

      toast({
        title: 'Table created',
        description: `Table ${newTableNumber} has been added to the floor plan.`,
      })
    },
    [activeSection, tables, supabase, toast]
  )

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true)

    // Prepare bulk update
    const updates = tables.map((table) => ({
      id: table.id,
      table_number: table.table_number,
      capacity: table.capacity,
      x_position: table.x_position,
      y_position: table.y_position,
      status: table.status,
      shape: table.shape,
      width: table.width,
      height: table.height,
      rotation: table.rotation,
      section_id: table.section_id,
      is_active: table.is_active,
    }))

    try {
      // Use bulk update API
      const response = await fetch('/api/tables', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to save floor plan')
      }

      setHasUnsavedChanges(false)

      toast({
        title: 'Floor plan saved',
        description: 'All changes have been saved successfully.',
      })
    } catch (error) {
      toast({
        title: 'Error saving floor plan',
        description:
          error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }, [tables, toast])

  // Handle bulk QR generation
  const handleGenerateAllQR = useCallback(async () => {
    setIsGeneratingQR(true)
    try {
      const response = await fetch('/api/tables/qr-code')
      const data = await response.json()

      if (data.success) {
        toast({
          title: t('floorplan.qrGenerated'),
          description: `${data.generated} QR codes generated successfully.`,
        })
        // Refresh tables to get updated qr_code_url
        fetchTables()
      } else {
        throw new Error('Failed to generate QR codes')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate QR codes',
        variant: 'destructive',
      })
    } finally {
      setIsGeneratingQR(false)
    }
  }, [toast, t, fetchTables])

  // Handle QR PDF download
  const handleDownloadQRPDF = useCallback(async () => {
    setIsDownloadingPDF(true)
    try {
      const response = await fetch('/api/tables/qr-pdf')
      if (!response.ok) throw new Error('Failed to generate PDF')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cheers-qr-codes-${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)

      toast({
        title: t('floorplan.pdfDownloaded'),
        description: 'QR PDF downloaded successfully.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to download PDF',
        variant: 'destructive',
      })
    } finally {
      setIsDownloadingPDF(false)
    }
  }, [toast, t])

  // Filtered tables for active section
  const activeTables = tables.filter((t) => t.section_id === activeSection)

  return (
    <div className="-m-4 md:-m-6 flex flex-col h-screen">
      {/* Header */}
      <div className="border-b p-6">
        <h1 className="text-2xl font-bold">{t('floorplan.title')}</h1>
        <p className="text-muted-foreground">
          {t('floorplan.subtitle')}
        </p>
      </div>

      {/* Toolbar */}
      <FloorPlanToolbar
        onAddTable={handleAddTable}
        onSave={handleSave}
        onGenerateAllQR={handleGenerateAllQR}
        onDownloadQRPDF={handleDownloadQRPDF}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        isGeneratingQR={isGeneratingQR}
        isDownloadingPDF={isDownloadingPDF}
      />

      {/* Section Tabs */}
      <div className="px-6 pt-4">
        <FloorSectionTabs
          sections={sections}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 p-6 overflow-auto">
          {isLoading ? (
            <Skeleton className="w-full h-[600px]" />
          ) : (
            <FloorPlanCanvas
              tables={activeTables}
              onTableMove={handleTableMove}
              onTableSelect={handleTableSelect}
              selectedTable={selectedTable}
              className="w-full h-full"
            />
          )}
        </div>

        {/* Properties Panel */}
        <div className="w-80 border-l overflow-auto">
          <TablePropertiesPanel
            table={selectedTable}
            onUpdate={handleTableUpdate}
            onDelete={handleTableDelete}
          />
        </div>
      </div>
    </div>
  )
}
