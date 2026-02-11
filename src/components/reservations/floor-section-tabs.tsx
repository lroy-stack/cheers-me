'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslations } from 'next-intl'

export interface FloorSection {
  id: string
  name: string
  description?: string
  sort_order?: number
  is_active: boolean
}

interface FloorSectionTabsProps {
  sections: FloorSection[]
  activeSection: string | null
  onSectionChange: (sectionId: string) => void
}

export function FloorSectionTabs({
  sections,
  activeSection,
  onSectionChange,
}: FloorSectionTabsProps) {
  const t = useTranslations('reservations.floorSections')

  const activeSections = sections
    .filter((s) => s.is_active)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

  if (activeSections.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        {t('noSections')}
      </div>
    )
  }

  return (
    <Tabs
      value={activeSection || activeSections[0]?.id}
      onValueChange={onSectionChange}
      className="w-full"
    >
      <TabsList className="w-full justify-start">
        {activeSections.map((section) => (
          <TabsTrigger key={section.id} value={section.id} className="flex-1">
            {section.name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
