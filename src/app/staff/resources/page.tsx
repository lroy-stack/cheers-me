'use client'

import { useState, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useAuthContext } from '@/components/providers/auth-provider'
import {
  GUIDES,
  GUIDE_CATEGORIES,
  type GuideCategory,
  type GuideMetadata,
} from '@/lib/data/resource-guides'
import { ResourceSearch } from '@/components/staff/resources/resource-search'
import { ResourceGuideList, type TrainingStatusMap } from '@/components/staff/resources/resource-guide-list'
import { ResourceGuideDetail } from '@/components/staff/resources/resource-guide-detail'
import { TrainingComplianceDashboard } from '@/components/staff/resources/training-compliance-dashboard'
import { CourseCard } from '@/components/staff/resources/course-card'
import { CourseStudyView } from '@/components/staff/resources/course-study-view'
import { TrainingTest } from '@/components/staff/resources/training-test'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  ShieldCheck,
  HardHat,
  Scale,
  UserCog,
  FileCheck,
  Leaf,
  GraduationCap,
  BarChart3,
  Award,
} from 'lucide-react'
import { useTrainingRecords } from '@/hooks/use-training-records'
import { useTrainingAssignments } from '@/hooks/use-training-assignments'
import { useTrainingMaterials } from '@/hooks/use-training-materials'
import { CertificateCard } from '@/components/staff/resources/certificate-card'

const categoryIcons: Record<GuideCategory, React.ElementType> = {
  food_safety: ShieldCheck,
  occupational_health: HardHat,
  labor_regulations: Scale,
  role_specific: UserCog,
  required_docs: FileCheck,
  environmental: Leaf,
}

export default function ResourcesPage() {
  const t = useTranslations('resources')
  const locale = useLocale()
  const { profile } = useAuthContext()
  const userRole = profile?.role ?? null
  const canManage = profile !== null && ['admin', 'manager', 'owner'].includes(profile.role)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGuide, setSelectedGuide] = useState<GuideMetadata | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('guides')
  const [activeCategory, setActiveCategory] = useState<GuideCategory>('food_safety')
  const [studyOpen, setStudyOpen] = useState(false)
  const [studyGuide, setStudyGuide] = useState<GuideMetadata | null>(null)
  const [testOpen, setTestOpen] = useState(false)
  const [testGuide, setTestGuide] = useState<GuideMetadata | null>(null)
  const { records } = useTrainingRecords()
  const { assignments } = useTrainingAssignments()
  const { materials: trainingMaterials } = useTrainingMaterials()

  // Build training status map for guide list badges
  const trainingStatuses: TrainingStatusMap = useMemo(() => {
    const map: TrainingStatusMap = {}

    // From assignments
    for (const a of assignments) {
      if (a.status === 'completed') {
        map[a.guide_code] = 'completed'
      } else if (a.status === 'overdue') {
        if (map[a.guide_code] !== 'completed') {
          map[a.guide_code] = 'overdue'
        }
      } else if (a.status === 'pending') {
        if (!map[a.guide_code]) {
          map[a.guide_code] = 'pending'
        }
      }
    }

    // From records (only test_passed marks completion)
    for (const r of records) {
      if (r.action === 'test_passed') {
        map[r.guide_code] = 'completed'
      }
    }

    return map
  }, [assignments, records])

  // Get training material for selected guide
  const selectedMaterial = useMemo(() => {
    if (!selectedGuide) return null
    return trainingMaterials.find((m) => m.guide_code === selectedGuide.code) || null
  }, [selectedGuide, trainingMaterials])

  // Filter guides based on user role and search query
  // Admin, owner, and manager can see ALL guides (they manage all departments)
  const filteredGuides = useMemo(() => {
    const isAdminRole = userRole && ['admin', 'owner', 'manager'].includes(userRole)
    return GUIDES.filter((guide) => {
      const roleMatch =
        isAdminRole ||
        guide.applicableRoles.length === 0 ||
        (userRole && guide.applicableRoles.includes(userRole))

      if (!roleMatch) return false

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const codeMatch = guide.code.toLowerCase().includes(query)
        const titleTranslated = t(guide.titleKey).toLowerCase()
        const titleMatch = titleTranslated.includes(query)
        return codeMatch || titleMatch
      }

      return true
    })
  }, [userRole, searchQuery, t])

  // My training: guides assigned to me or mandatory for my role
  const myTrainingGuides = useMemo(() => {
    const assignedCodes = new Set(
      assignments
        .filter((a) => a.status !== 'completed')
        .map((a) => a.guide_code)
    )

    return GUIDES.filter((guide) => {
      if (assignedCodes.has(guide.code)) return true
      return false
    })
  }, [assignments])

  // Certified guides: guides where user has test_passed records
  const certifiedGuides = useMemo(() => {
    const passedCodes = new Set(
      records
        .filter((r) => r.action === 'test_passed')
        .map((r) => r.guide_code)
    )
    return GUIDES.filter((guide) => passedCodes.has(guide.code))
  }, [records])

  // Get the test_passed record for a guide
  const getCertRecord = (guideCode: string) => {
    return records
      .filter((r) => r.guide_code === guideCode && r.action === 'test_passed')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
  }

  // Group filtered guides by category
  const guidesByCategory = useMemo(() => {
    const grouped: Record<GuideCategory, GuideMetadata[]> = {
      food_safety: [],
      occupational_health: [],
      labor_regulations: [],
      role_specific: [],
      required_docs: [],
      environmental: [],
    }

    filteredGuides.forEach((guide) => {
      grouped[guide.category].push(guide)
    })

    return grouped
  }, [filteredGuides])

  const handleSelectGuide = (guide: GuideMetadata) => {
    setSelectedGuide(guide)
    setDetailOpen(true)
  }

  const handleSelectRelated = (code: string) => {
    const related = GUIDES.find((g) => g.code === code)
    if (related) {
      setSelectedGuide(related)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {filteredGuides.length} {t('guidesCount')}
          </Badge>
        </div>
      </div>

      {/* Main Tabs: Guides / My Training / Compliance */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto gap-1">
          <TabsTrigger value="guides" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            {t('title')}
          </TabsTrigger>
          <TabsTrigger value="myTraining" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            {t('training.myTraining')}
            {myTrainingGuides.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-xs">
                {myTrainingGuides.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="certificates" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            {t('training.myCertificates')}
            {certifiedGuides.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-xs">
                {certifiedGuides.length}
              </Badge>
            )}
          </TabsTrigger>
          {canManage && (
            <TabsTrigger value="compliance" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('training.complianceOverview')}
            </TabsTrigger>
          )}
        </TabsList>

        {/* Guides Tab */}
        <TabsContent value="guides" className="space-y-4">
          {/* Search */}
          <ResourceSearch value={searchQuery} onChange={setSearchQuery} />

          {/* Category Tabs */}
          <Tabs
            value={activeCategory}
            onValueChange={(value) => setActiveCategory(value as GuideCategory)}
          >
            <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
              {GUIDE_CATEGORIES.map((category) => {
                const Icon = categoryIcons[category.id]
                const count = guidesByCategory[category.id].length
                return (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2 rounded-lg border"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {t(category.labelKey)}
                    </span>
                    <Badge
                      variant="secondary"
                      className="ml-1 h-5 min-w-[20px] flex items-center justify-center text-xs"
                    >
                      {count}
                    </Badge>
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {GUIDE_CATEGORIES.map((category) => (
              <TabsContent key={category.id} value={category.id} className="mt-4">
                {guidesByCategory[category.id].length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>{t('noGuidesInCategory')}</p>
                  </div>
                ) : (
                  <ResourceGuideList
                    guides={guidesByCategory[category.id]}
                    onSelect={handleSelectGuide}
                    trainingStatuses={trainingStatuses}
                  />
                )}
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        {/* My Training Tab */}
        <TabsContent value="myTraining" className="space-y-4">
          {myTrainingGuides.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">{t('course.noPending')}</p>
              <p className="text-sm mt-1">{t('course.allComplete')}</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myTrainingGuides.map((guide) => (
                <CourseCard
                  key={guide.code}
                  guide={guide}
                  assignment={assignments.find((a) => a.guide_code === guide.code)}
                  trainingStatus={trainingStatuses[guide.code]}
                  onSelect={(g) => {
                    setStudyGuide(g)
                    setStudyOpen(true)
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* My Certificates Tab */}
        <TabsContent value="certificates" className="space-y-4">
          {certifiedGuides.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">{t('training.noCertificates')}</p>
              <p className="text-sm mt-1">{t('training.noCertificatesDesc')}</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {certifiedGuides.map((guide) => {
                const record = getCertRecord(guide.code)
                if (!record) return null
                return (
                  <CertificateCard
                    key={guide.code}
                    guide={guide}
                    record={record}
                    locale={locale}
                  />
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Compliance Tab (managers only) */}
        {canManage && (
          <TabsContent value="compliance">
            <TrainingComplianceDashboard />
          </TabsContent>
        )}
      </Tabs>

      {/* Guide Detail Sheet */}
      <ResourceGuideDetail
        guide={selectedGuide}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onSelectRelated={handleSelectRelated}
        trainingMaterial={selectedMaterial}
      />

      {/* Course Study View */}
      <CourseStudyView
        guide={studyGuide}
        open={studyOpen}
        onOpenChange={setStudyOpen}
        onTakeTest={() => {
          setTestGuide(studyGuide)
          setStudyOpen(false)
          setTestOpen(true)
        }}
      />

      {/* Test from Course Study */}
      <TrainingTest
        guideCode={testGuide?.code ?? null}
        guideName={testGuide ? t(testGuide.titleKey) : ''}
        open={testOpen}
        onOpenChange={setTestOpen}
        lang={locale}
      />
    </div>
  )
}

// Re-export for use in the page
function BookOpen(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  )
}
