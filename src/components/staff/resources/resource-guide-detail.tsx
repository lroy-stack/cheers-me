'use client'

import { useMemo, useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import {
  GUIDES,
  GUIDE_CATEGORIES,
  type GuideCategory,
  type GuideMetadata,
} from '@/lib/data/resource-guides'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ShieldCheck,
  HardHat,
  Scale,
  UserCog,
  FileCheck,
  Leaf,
  Download,
  Award,
  BookOpen,
  Link2,
  Users,
  Gavel,
  ClipboardCheck,
  UserPlus,
  ChevronDown,
  Globe,
} from 'lucide-react'
import { useTrainingRecords } from '@/hooks/use-training-records'
import { useAuthContext } from '@/components/providers/auth-provider'
import { TrainingTest } from './training-test'
import { TrainingAssignmentDialog } from './training-assignment-dialog'

const categoryIcons: Record<GuideCategory, React.ElementType> = {
  food_safety: ShieldCheck,
  occupational_health: HardHat,
  labor_regulations: Scale,
  role_specific: UserCog,
  required_docs: FileCheck,
  environmental: Leaf,
}

const roleColors: Record<string, string> = {
  kitchen:
    'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  bar: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  waiter:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  admin:
    'bg-muted text-foreground dark:bg-card/30 dark:text-muted-foreground',
  manager:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  owner:
    'bg-primary/10 text-primary dark:bg-primary/10 dark:text-primary',
  dj: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
}

interface ResourceGuideDetailProps {
  guide: GuideMetadata | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectRelated: (code: string) => void
  trainingMaterial?: { requires_test: boolean } | null
}

export function ResourceGuideDetail({
  guide,
  open,
  onOpenChange,
  onSelectRelated,
}: ResourceGuideDetailProps) {
  const t = useTranslations('resources')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const { profile } = useAuthContext()

  const canManage = profile !== null && ['admin', 'manager', 'owner'].includes(profile.role)

  const { records, recordView, refetch: refetchRecords } = useTrainingRecords(guide?.code)

  const [testOpen, setTestOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)

  // Track view when guide is opened
  useEffect(() => {
    if (open && guide) {
      recordView(guide.code, locale)
    }
  }, [open, guide, locale, recordView])

  // Resolve the guide key prefix from titleKey
  const guideKeyPrefix = useMemo(() => {
    if (!guide) return ''
    return guide.titleKey.replace('.title', '')
  }, [guide])

  // Get key points as array
  const keyPoints = useMemo(() => {
    if (!guide) return []
    try {
      const raw = t.raw(`${guideKeyPrefix}.keyPoints`)
      if (Array.isArray(raw)) {
        return raw as string[]
      }
      if (typeof raw === 'string') {
        return raw.split('|').map((s: string) => s.trim()).filter(Boolean)
      }
      return []
    } catch {
      return []
    }
  }, [guide, guideKeyPrefix, t])

  // Get related guides metadata
  const relatedGuides = useMemo(() => {
    if (!guide) return []
    return guide.relatedCodes
      .map((code) => GUIDES.find((g) => g.code === code))
      .filter((g): g is GuideMetadata => g !== undefined)
  }, [guide])

  // Get category label
  const categoryLabel = useMemo(() => {
    if (!guide) return ''
    const cat = GUIDE_CATEGORIES.find((c) => c.id === guide.category)
    return cat ? t(cat.labelKey) : ''
  }, [guide, t])

  // Get short description
  const shortDescription = useMemo(() => {
    if (!guide) return ''
    const summary = t(`${guideKeyPrefix}.summary`)
    const firstSentence = summary.split('.')[0]
    return firstSentence ? firstSentence + '.' : summary
  }, [guide, guideKeyPrefix, t])

  // Training status from records
  const trainingStatus = useMemo(() => {
    if (!records || records.length === 0) return 'not_viewed'
    const hasTestPassed = records.some((r) => r.action === 'test_passed')
    const hasTestFailed = records.some((r) => r.action === 'test_failed')
    const hasViewed = records.some((r) => r.action === 'viewed' || r.action === 'downloaded')

    if (hasTestPassed) return 'passed'
    if (hasTestFailed) return 'failed'
    if (hasViewed) return 'viewed'
    return 'not_viewed'
  }, [records])

  const handleDownloadCertificate = () => {
    if (!guide) return
    const url = `/api/staff/training/certificate/${guide.code}?lang=${locale}`
    const a = document.createElement('a')
    a.href = url
    a.download = `certificate-${guide.code}-${locale}.pdf`
    a.click()
  }

  const handleDownloadPdf = (lang: string) => {
    if (!guide) return
    const url = `/api/staff/training/pdf/${guide.code}?lang=${lang}`
    const a = document.createElement('a')
    a.href = url
    a.download = `${guide.code}-${lang}.pdf`
    a.click()
  }

  const pdfLanguages = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  ]

  if (!guide) return null

  const CategoryIcon = categoryIcons[guide.category]

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {/* Header */}
              <SheetHeader className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-xs">
                    {guide.code}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1 text-xs"
                  >
                    <CategoryIcon className="h-3 w-3" />
                    {categoryLabel}
                  </Badge>
                  {/* Training status badge */}
                  {trainingStatus === 'passed' && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-0 text-xs">
                      {t('training.statusPassed')}
                    </Badge>
                  )}
                  {trainingStatus === 'failed' && (
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-0 text-xs">
                      {t('training.statusFailed')}
                    </Badge>
                  )}
                  {trainingStatus === 'viewed' && (
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-0 text-xs">
                      {t('training.statusViewed')}
                    </Badge>
                  )}
                </div>
                <SheetTitle className="text-xl leading-tight">
                  {t(guide.titleKey)}
                </SheetTitle>
                <SheetDescription>
                  {shortDescription}
                </SheetDescription>
              </SheetHeader>

              <Separator />

              {/* Legal Basis */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Gavel className="h-4 w-4 text-muted-foreground" />
                  {t('legalBasis')}
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                  {t(guide.legalBasisKey)}
                </div>
              </div>

              <Separator />

              {/* Summary */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  {t('summary')}
                </div>
                <div className="text-sm text-muted-foreground space-y-3 leading-relaxed">
                  {t(`${guideKeyPrefix}.summary`)
                    .split('\n')
                    .filter(Boolean)
                    .map((paragraph, idx) => (
                      <p key={idx}>{paragraph}</p>
                    ))}
                </div>
              </div>

              <Separator />

              {/* Key Points */}
              {keyPoints.length > 0 && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      {t('keyPointsLabel')}
                    </div>
                    <ul className="space-y-2">
                      {keyPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Checkbox
                            checked={true}
                            disabled
                            className="mt-0.5 shrink-0"
                          />
                          <span className="text-sm text-muted-foreground leading-tight">
                            {point}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Separator />
                </>
              )}

              {/* Applicable Roles */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {t('applicableRoles')}
                </div>
                <div className="flex flex-wrap gap-2">
                  {guide.applicableRoles.length === 0 ? (
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-0">
                      {t('allRoles')}
                    </Badge>
                  ) : (
                    guide.applicableRoles.map((role) => (
                      <Badge
                        key={role}
                        className={`border-0 ${roleColors[role] || 'bg-muted text-foreground'}`}
                      >
                        {tCommon(`roles.${role}`)}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              {/* Related Guides */}
              {relatedGuides.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                      {t('relatedGuides')}
                    </div>
                    <div className="space-y-2">
                      {relatedGuides.map((related) => (
                        <button
                          key={related.code}
                          onClick={() => onSelectRelated(related.code)}
                          className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                        >
                          <Badge
                            variant="outline"
                            className="font-mono text-xs shrink-0"
                          >
                            {related.code}
                          </Badge>
                          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors truncate">
                            {t(related.titleKey)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Download Certificate (if passed) */}
              {trainingStatus === 'passed' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleDownloadCertificate}
                  className="w-full flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Award className="h-4 w-4" />
                  {t('training.downloadCertificate')}
                </Button>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      {t('training.downloadPdf')}
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {pdfLanguages.map((lang) => (
                      <DropdownMenuItem
                        key={lang.code}
                        onClick={() => handleDownloadPdf(lang.code)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <span className="text-base">{lang.flag}</span>
                        <span>{lang.label}</span>
                        {lang.code === locale && (
                          <Globe className="h-3 w-3 ml-auto opacity-50" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTestOpen(true)}
                  className="flex items-center gap-2"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  {t('training.takeTest')}
                </Button>

                {canManage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAssignOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    {t('training.assignTraining')}
                  </Button>
                )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Test Sheet */}
      <TrainingTest
        guideCode={guide.code}
        guideName={t(guide.titleKey)}
        open={testOpen}
        onOpenChange={setTestOpen}
        lang={locale}
        onCompleted={refetchRecords}
      />

      {/* Assignment Dialog */}
      <TrainingAssignmentDialog
        guideCode={guide.code}
        guideName={t(guide.titleKey)}
        open={assignOpen}
        onOpenChange={setAssignOpen}
      />
    </>
  )
}
