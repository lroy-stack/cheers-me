import type { UserRole } from '@/types'

export type GuideCategory =
  | 'food_safety'
  | 'occupational_health'
  | 'labor_regulations'
  | 'role_specific'
  | 'required_docs'
  | 'environmental'

export interface GuideMetadata {
  code: string
  titleKey: string
  category: GuideCategory
  applicableRoles: UserRole[] // empty = all roles
  relatedCodes: string[]
  legalBasisKey: string
}

export const GUIDE_CATEGORIES: Array<{
  id: GuideCategory
  labelKey: string
  icon: string
}> = [
  { id: 'food_safety', labelKey: 'categories.foodSafety', icon: 'ShieldCheck' },
  {
    id: 'occupational_health',
    labelKey: 'categories.occupationalHealth',
    icon: 'HardHat',
  },
  {
    id: 'labor_regulations',
    labelKey: 'categories.laborRegulations',
    icon: 'Scale',
  },
  { id: 'role_specific', labelKey: 'categories.roleSpecific', icon: 'UserCog' },
  {
    id: 'required_docs',
    labelKey: 'categories.requiredDocs',
    icon: 'FileCheck',
  },
  { id: 'environmental', labelKey: 'categories.environmental', icon: 'Leaf' },
]

// ============================================================================
// FOOD SAFETY GUIDES (G-FS-001 to G-FS-022)
// ============================================================================

const FOOD_SAFETY_GUIDES: GuideMetadata[] = [
  {
    code: 'G-FS-001',
    titleKey: 'guides.GFS001.title',
    category: 'food_safety',
    applicableRoles: [],
    relatedCodes: ['G-FS-002', 'G-FS-003', 'G-FS-004', 'G-FS-005'],
    legalBasisKey: 'guides.GFS001.legalBasis',
  },
  {
    code: 'G-FS-002',
    titleKey: 'guides.GFS002.title',
    category: 'food_safety',
    applicableRoles: [],
    relatedCodes: ['G-FS-001', 'G-FS-015'],
    legalBasisKey: 'guides.GFS002.legalBasis',
  },
  {
    code: 'G-FS-003',
    titleKey: 'guides.GFS003.title',
    category: 'food_safety',
    applicableRoles: ['kitchen', 'bar'],
    relatedCodes: ['G-FS-004', 'G-FS-011', 'G-FS-017'],
    legalBasisKey: 'guides.GFS003.legalBasis',
  },
  {
    code: 'G-FS-004',
    titleKey: 'guides.GFS004.title',
    category: 'food_safety',
    applicableRoles: ['kitchen'],
    relatedCodes: ['G-FS-003', 'G-FS-019', 'G-FS-018'],
    legalBasisKey: 'guides.GFS004.legalBasis',
  },
  {
    code: 'G-FS-005',
    titleKey: 'guides.GFS005.title',
    category: 'food_safety',
    applicableRoles: [],
    relatedCodes: ['G-FS-001', 'G-FS-013', 'G-FS-015'],
    legalBasisKey: 'guides.GFS005.legalBasis',
  },
  {
    code: 'G-FS-006',
    titleKey: 'guides.GFS006.title',
    category: 'food_safety',
    applicableRoles: [],
    relatedCodes: ['G-FS-001', 'G-FS-019', 'G-FS-020'],
    legalBasisKey: 'guides.GFS006.legalBasis',
  },
  {
    code: 'G-FS-007',
    titleKey: 'guides.GFS007.title',
    category: 'food_safety',
    applicableRoles: [],
    relatedCodes: ['G-FS-011', 'G-ENV-001', 'G-ENV-005'],
    legalBasisKey: 'guides.GFS007.legalBasis',
  },
  {
    code: 'G-FS-008',
    titleKey: 'guides.GFS008.title',
    category: 'food_safety',
    applicableRoles: ['kitchen', 'bar'],
    relatedCodes: ['G-FS-009', 'G-FS-010', 'G-FS-001'],
    legalBasisKey: 'guides.GFS008.legalBasis',
  },
  {
    code: 'G-FS-009',
    titleKey: 'guides.GFS009.title',
    category: 'food_safety',
    applicableRoles: ['kitchen', 'bar'],
    relatedCodes: ['G-FS-008', 'G-FS-010'],
    legalBasisKey: 'guides.GFS009.legalBasis',
  },
  {
    code: 'G-FS-010',
    titleKey: 'guides.GFS010.title',
    category: 'food_safety',
    applicableRoles: ['kitchen', 'bar'],
    relatedCodes: ['G-FS-003', 'G-FS-008', 'G-FS-009'],
    legalBasisKey: 'guides.GFS010.legalBasis',
  },
  {
    code: 'G-FS-011',
    titleKey: 'guides.GFS011.title',
    category: 'food_safety',
    applicableRoles: ['kitchen', 'bar'],
    relatedCodes: ['G-FS-003', 'G-FS-010', 'G-FS-012'],
    legalBasisKey: 'guides.GFS011.legalBasis',
  },
  {
    code: 'G-FS-012',
    titleKey: 'guides.GFS012.title',
    category: 'food_safety',
    applicableRoles: ['kitchen', 'bar'],
    relatedCodes: ['G-FS-005', 'G-FS-011', 'G-FS-015'],
    legalBasisKey: 'guides.GFS012.legalBasis',
  },
  {
    code: 'G-FS-013',
    titleKey: 'guides.GFS013.title',
    category: 'food_safety',
    applicableRoles: [],
    relatedCodes: ['G-FS-005', 'G-FS-014'],
    legalBasisKey: 'guides.GFS013.legalBasis',
  },
  {
    code: 'G-FS-014',
    titleKey: 'guides.GFS014.title',
    category: 'food_safety',
    applicableRoles: [],
    relatedCodes: ['G-FS-005', 'G-FS-013'],
    legalBasisKey: 'guides.GFS014.legalBasis',
  },
  {
    code: 'G-FS-015',
    titleKey: 'guides.GFS015.title',
    category: 'food_safety',
    applicableRoles: [],
    relatedCodes: ['G-FS-002', 'G-FS-005', 'G-FS-012'],
    legalBasisKey: 'guides.GFS015.legalBasis',
  },
  {
    code: 'G-FS-016',
    titleKey: 'guides.GFS016.title',
    category: 'food_safety',
    applicableRoles: ['kitchen'],
    relatedCodes: ['G-FS-003', 'G-FS-021'],
    legalBasisKey: 'guides.GFS016.legalBasis',
  },
  {
    code: 'G-FS-017',
    titleKey: 'guides.GFS017.title',
    category: 'food_safety',
    applicableRoles: ['kitchen'],
    relatedCodes: ['G-FS-003', 'G-FS-011', 'G-FS-012'],
    legalBasisKey: 'guides.GFS017.legalBasis',
  },
  {
    code: 'G-FS-018',
    titleKey: 'guides.GFS018.title',
    category: 'food_safety',
    applicableRoles: ['kitchen'],
    relatedCodes: ['G-FS-004', 'G-FS-021'],
    legalBasisKey: 'guides.GFS018.legalBasis',
  },
  {
    code: 'G-FS-019',
    titleKey: 'guides.GFS019.title',
    category: 'food_safety',
    applicableRoles: ['kitchen', 'bar', 'waiter'],
    relatedCodes: ['G-FS-003', 'G-FS-004', 'G-FS-006'],
    legalBasisKey: 'guides.GFS019.legalBasis',
  },
  {
    code: 'G-FS-020',
    titleKey: 'guides.GFS020.title',
    category: 'food_safety',
    applicableRoles: ['kitchen', 'bar', 'waiter'],
    relatedCodes: ['G-FS-003', 'G-FS-006', 'G-FS-008'],
    legalBasisKey: 'guides.GFS020.legalBasis',
  },
  {
    code: 'G-FS-021',
    titleKey: 'guides.GFS021.title',
    category: 'food_safety',
    applicableRoles: ['kitchen'],
    relatedCodes: ['G-FS-016', 'G-FS-022'],
    legalBasisKey: 'guides.GFS021.legalBasis',
  },
  {
    code: 'G-FS-022',
    titleKey: 'guides.GFS022.title',
    category: 'food_safety',
    applicableRoles: [],
    relatedCodes: ['G-FS-001', 'G-FS-021'],
    legalBasisKey: 'guides.GFS022.legalBasis',
  },
]

// ============================================================================
// OCCUPATIONAL HEALTH GUIDES (G-PRL-001 to G-PRL-018)
// ============================================================================

const OCCUPATIONAL_HEALTH_GUIDES: GuideMetadata[] = [
  {
    code: 'G-PRL-001',
    titleKey: 'guides.GPRL001.title',
    category: 'occupational_health',
    applicableRoles: [],
    relatedCodes: ['G-PRL-002', 'G-PRL-003', 'G-PRL-004'],
    legalBasisKey: 'guides.GPRL001.legalBasis',
  },
  {
    code: 'G-PRL-002',
    titleKey: 'guides.GPRL002.title',
    category: 'occupational_health',
    applicableRoles: [],
    relatedCodes: ['G-PRL-001', 'G-PRL-003'],
    legalBasisKey: 'guides.GPRL002.legalBasis',
  },
  {
    code: 'G-PRL-003',
    titleKey: 'guides.GPRL003.title',
    category: 'occupational_health',
    applicableRoles: [],
    relatedCodes: ['G-PRL-001', 'G-PRL-002'],
    legalBasisKey: 'guides.GPRL003.legalBasis',
  },
  {
    code: 'G-PRL-004',
    titleKey: 'guides.GPRL004.title',
    category: 'occupational_health',
    applicableRoles: [],
    relatedCodes: ['G-PRL-001', 'G-PRL-005', 'G-PRL-006'],
    legalBasisKey: 'guides.GPRL004.legalBasis',
  },
  {
    code: 'G-PRL-005',
    titleKey: 'guides.GPRL005.title',
    category: 'occupational_health',
    applicableRoles: [],
    relatedCodes: ['G-PRL-004', 'G-PRL-006', 'G-PRL-013'],
    legalBasisKey: 'guides.GPRL005.legalBasis',
  },
  {
    code: 'G-PRL-006',
    titleKey: 'guides.GPRL006.title',
    category: 'occupational_health',
    applicableRoles: [],
    relatedCodes: ['G-PRL-004', 'G-PRL-005'],
    legalBasisKey: 'guides.GPRL006.legalBasis',
  },
  {
    code: 'G-PRL-007',
    titleKey: 'guides.GPRL007.title',
    category: 'occupational_health',
    applicableRoles: ['kitchen'],
    relatedCodes: ['G-PRL-008', 'G-ROL-001'],
    legalBasisKey: 'guides.GPRL007.legalBasis',
  },
  {
    code: 'G-PRL-008',
    titleKey: 'guides.GPRL008.title',
    category: 'occupational_health',
    applicableRoles: ['kitchen', 'bar', 'waiter'],
    relatedCodes: ['G-PRL-007', 'G-PRL-003'],
    legalBasisKey: 'guides.GPRL008.legalBasis',
  },
  {
    code: 'G-PRL-009',
    titleKey: 'guides.GPRL009.title',
    category: 'occupational_health',
    applicableRoles: ['kitchen', 'bar'],
    relatedCodes: ['G-PRL-003', 'G-FS-005'],
    legalBasisKey: 'guides.GPRL009.legalBasis',
  },
  {
    code: 'G-PRL-010',
    titleKey: 'guides.GPRL010.title',
    category: 'occupational_health',
    applicableRoles: ['kitchen'],
    relatedCodes: ['G-PRL-003', 'G-PRL-007'],
    legalBasisKey: 'guides.GPRL010.legalBasis',
  },
  {
    code: 'G-PRL-011',
    titleKey: 'guides.GPRL011.title',
    category: 'occupational_health',
    applicableRoles: ['kitchen', 'bar', 'dj'],
    relatedCodes: ['G-PRL-003', 'G-PRL-018'],
    legalBasisKey: 'guides.GPRL011.legalBasis',
  },
  {
    code: 'G-PRL-012',
    titleKey: 'guides.GPRL012.title',
    category: 'occupational_health',
    applicableRoles: [],
    relatedCodes: ['G-PRL-004', 'G-PRL-013'],
    legalBasisKey: 'guides.GPRL012.legalBasis',
  },
  {
    code: 'G-PRL-013',
    titleKey: 'guides.GPRL013.title',
    category: 'occupational_health',
    applicableRoles: [],
    relatedCodes: ['G-PRL-004', 'G-PRL-005', 'G-PRL-012'],
    legalBasisKey: 'guides.GPRL013.legalBasis',
  },
  {
    code: 'G-PRL-014',
    titleKey: 'guides.GPRL014.title',
    category: 'occupational_health',
    applicableRoles: ['kitchen'],
    relatedCodes: ['G-PRL-004', 'G-PRL-012'],
    legalBasisKey: 'guides.GPRL014.legalBasis',
  },
  {
    code: 'G-PRL-015',
    titleKey: 'guides.GPRL015.title',
    category: 'occupational_health',
    applicableRoles: [],
    relatedCodes: ['G-PRL-001', 'G-PRL-016'],
    legalBasisKey: 'guides.GPRL015.legalBasis',
  },
  {
    code: 'G-PRL-016',
    titleKey: 'guides.GPRL016.title',
    category: 'occupational_health',
    applicableRoles: [],
    relatedCodes: ['G-PRL-001', 'G-PRL-015', 'G-LAB-006'],
    legalBasisKey: 'guides.GPRL016.legalBasis',
  },
  {
    code: 'G-PRL-017',
    titleKey: 'guides.GPRL017.title',
    category: 'occupational_health',
    applicableRoles: [],
    relatedCodes: ['G-PRL-001', 'G-LAB-002', 'G-PRL-018'],
    legalBasisKey: 'guides.GPRL017.legalBasis',
  },
  {
    code: 'G-PRL-018',
    titleKey: 'guides.GPRL018.title',
    category: 'occupational_health',
    applicableRoles: [],
    relatedCodes: ['G-PRL-001', 'G-PRL-017', 'G-ROL-010'],
    legalBasisKey: 'guides.GPRL018.legalBasis',
  },
]

// ============================================================================
// LABOR REGULATIONS GUIDES (G-LAB-001 to G-LAB-009)
// ============================================================================

const LABOR_REGULATIONS_GUIDES: GuideMetadata[] = [
  {
    code: 'G-LAB-001',
    titleKey: 'guides.GLAB001.title',
    category: 'labor_regulations',
    applicableRoles: [],
    relatedCodes: ['G-LAB-002', 'G-LAB-003', 'G-LAB-006'],
    legalBasisKey: 'guides.GLAB001.legalBasis',
  },
  {
    code: 'G-LAB-002',
    titleKey: 'guides.GLAB002.title',
    category: 'labor_regulations',
    applicableRoles: [],
    relatedCodes: ['G-LAB-001', 'G-LAB-003', 'G-LAB-005'],
    legalBasisKey: 'guides.GLAB002.legalBasis',
  },
  {
    code: 'G-LAB-003',
    titleKey: 'guides.GLAB003.title',
    category: 'labor_regulations',
    applicableRoles: [],
    relatedCodes: ['G-LAB-001', 'G-LAB-002', 'G-LAB-005'],
    legalBasisKey: 'guides.GLAB003.legalBasis',
  },
  {
    code: 'G-LAB-004',
    titleKey: 'guides.GLAB004.title',
    category: 'labor_regulations',
    applicableRoles: [],
    relatedCodes: ['G-LAB-001', 'G-LAB-002'],
    legalBasisKey: 'guides.GLAB004.legalBasis',
  },
  {
    code: 'G-LAB-005',
    titleKey: 'guides.GLAB005.title',
    category: 'labor_regulations',
    applicableRoles: [],
    relatedCodes: ['G-LAB-002', 'G-LAB-003'],
    legalBasisKey: 'guides.GLAB005.legalBasis',
  },
  {
    code: 'G-LAB-006',
    titleKey: 'guides.GLAB006.title',
    category: 'labor_regulations',
    applicableRoles: [],
    relatedCodes: ['G-LAB-001', 'G-LAB-007'],
    legalBasisKey: 'guides.GLAB006.legalBasis',
  },
  {
    code: 'G-LAB-007',
    titleKey: 'guides.GLAB007.title',
    category: 'labor_regulations',
    applicableRoles: [],
    relatedCodes: ['G-LAB-001', 'G-LAB-006', 'G-ROL-010'],
    legalBasisKey: 'guides.GLAB007.legalBasis',
  },
  {
    code: 'G-LAB-008',
    titleKey: 'guides.GLAB008.title',
    category: 'labor_regulations',
    applicableRoles: [],
    relatedCodes: ['G-LAB-001', 'G-LAB-009'],
    legalBasisKey: 'guides.GLAB008.legalBasis',
  },
  {
    code: 'G-LAB-009',
    titleKey: 'guides.GLAB009.title',
    category: 'labor_regulations',
    applicableRoles: [],
    relatedCodes: ['G-LAB-001', 'G-LAB-008'],
    legalBasisKey: 'guides.GLAB009.legalBasis',
  },
]

// ============================================================================
// ROLE SPECIFIC GUIDES (G-ROL-001 to G-ROL-014)
// ============================================================================

const ROLE_SPECIFIC_GUIDES: GuideMetadata[] = [
  {
    code: 'G-ROL-001',
    titleKey: 'guides.GROL001.title',
    category: 'role_specific',
    applicableRoles: ['kitchen'],
    relatedCodes: ['G-PRL-013', 'G-PRL-004', 'G-ROL-005'],
    legalBasisKey: 'guides.GROL001.legalBasis',
  },
  {
    code: 'G-ROL-002',
    titleKey: 'guides.GROL002.title',
    category: 'role_specific',
    applicableRoles: ['kitchen'],
    relatedCodes: ['G-ROL-001', 'G-ROL-003', 'G-PRL-003'],
    legalBasisKey: 'guides.GROL002.legalBasis',
  },
  {
    code: 'G-ROL-003',
    titleKey: 'guides.GROL003.title',
    category: 'role_specific',
    applicableRoles: ['kitchen'],
    relatedCodes: ['G-ROL-001', 'G-ROL-002', 'G-PRL-006'],
    legalBasisKey: 'guides.GROL003.legalBasis',
  },
  {
    code: 'G-ROL-004',
    titleKey: 'guides.GROL004.title',
    category: 'role_specific',
    applicableRoles: ['kitchen'],
    relatedCodes: ['G-PRL-014', 'G-ROL-005'],
    legalBasisKey: 'guides.GROL004.legalBasis',
  },
  {
    code: 'G-ROL-005',
    titleKey: 'guides.GROL005.title',
    category: 'role_specific',
    applicableRoles: ['kitchen'],
    relatedCodes: ['G-ROL-001', 'G-ROL-004', 'G-PRL-012'],
    legalBasisKey: 'guides.GROL005.legalBasis',
  },
  {
    code: 'G-ROL-006',
    titleKey: 'guides.GROL006.title',
    category: 'role_specific',
    applicableRoles: ['bar'],
    relatedCodes: ['G-ROL-007', 'G-PRL-001'],
    legalBasisKey: 'guides.GROL006.legalBasis',
  },
  {
    code: 'G-ROL-007',
    titleKey: 'guides.GROL007.title',
    category: 'role_specific',
    applicableRoles: ['bar'],
    relatedCodes: ['G-ROL-006', 'G-PRL-003'],
    legalBasisKey: 'guides.GROL007.legalBasis',
  },
  {
    code: 'G-ROL-008',
    titleKey: 'guides.GROL008.title',
    category: 'role_specific',
    applicableRoles: ['waiter'],
    relatedCodes: ['G-ROL-009', 'G-PRL-008'],
    legalBasisKey: 'guides.GROL008.legalBasis',
  },
  {
    code: 'G-ROL-009',
    titleKey: 'guides.GROL009.title',
    category: 'role_specific',
    applicableRoles: ['waiter'],
    relatedCodes: ['G-ROL-008', 'G-PRL-003'],
    legalBasisKey: 'guides.GROL009.legalBasis',
  },
  {
    code: 'G-ROL-010',
    titleKey: 'guides.GROL010.title',
    category: 'role_specific',
    applicableRoles: [],
    relatedCodes: ['G-ROL-011', 'G-ROL-013', 'G-LAB-007'],
    legalBasisKey: 'guides.GROL010.legalBasis',
  },
  {
    code: 'G-ROL-011',
    titleKey: 'guides.GROL011.title',
    category: 'role_specific',
    applicableRoles: [],
    relatedCodes: ['G-ROL-010', 'G-ROL-013'],
    legalBasisKey: 'guides.GROL011.legalBasis',
  },
  {
    code: 'G-ROL-012',
    titleKey: 'guides.GROL012.title',
    category: 'role_specific',
    applicableRoles: [],
    relatedCodes: ['G-LAB-007', 'G-ROL-014'],
    legalBasisKey: 'guides.GROL012.legalBasis',
  },
  {
    code: 'G-ROL-013',
    titleKey: 'guides.GROL013.title',
    category: 'role_specific',
    applicableRoles: [],
    relatedCodes: ['G-ROL-010', 'G-ROL-011', 'G-PRL-018'],
    legalBasisKey: 'guides.GROL013.legalBasis',
  },
  {
    code: 'G-ROL-014',
    titleKey: 'guides.GROL014.title',
    category: 'role_specific',
    applicableRoles: [],
    relatedCodes: ['G-ROL-012', 'G-LAB-007'],
    legalBasisKey: 'guides.GROL014.legalBasis',
  },
]

// ============================================================================
// REQUIRED DOCS GUIDES (G-DOC-001 to G-DOC-005)
// ============================================================================

const REQUIRED_DOCS_GUIDES: GuideMetadata[] = [
  {
    code: 'G-DOC-001',
    titleKey: 'guides.GDOC001.title',
    category: 'required_docs',
    applicableRoles: ['admin', 'manager', 'owner'],
    relatedCodes: ['G-DOC-002', 'G-DOC-004', 'G-DOC-005'],
    legalBasisKey: 'guides.GDOC001.legalBasis',
  },
  {
    code: 'G-DOC-002',
    titleKey: 'guides.GDOC002.title',
    category: 'required_docs',
    applicableRoles: ['admin', 'manager', 'owner'],
    relatedCodes: ['G-DOC-001', 'G-DOC-003'],
    legalBasisKey: 'guides.GDOC002.legalBasis',
  },
  {
    code: 'G-DOC-003',
    titleKey: 'guides.GDOC003.title',
    category: 'required_docs',
    applicableRoles: ['admin', 'manager', 'owner'],
    relatedCodes: ['G-DOC-002', 'G-DOC-001'],
    legalBasisKey: 'guides.GDOC003.legalBasis',
  },
  {
    code: 'G-DOC-004',
    titleKey: 'guides.GDOC004.title',
    category: 'required_docs',
    applicableRoles: ['admin', 'manager', 'owner'],
    relatedCodes: ['G-DOC-001', 'G-FS-001', 'G-FS-005'],
    legalBasisKey: 'guides.GDOC004.legalBasis',
  },
  {
    code: 'G-DOC-005',
    titleKey: 'guides.GDOC005.title',
    category: 'required_docs',
    applicableRoles: ['admin', 'manager', 'owner'],
    relatedCodes: ['G-DOC-001', 'G-LAB-001', 'G-LAB-005'],
    legalBasisKey: 'guides.GDOC005.legalBasis',
  },
]

// ============================================================================
// ENVIRONMENTAL GUIDES (G-ENV-001 to G-ENV-005)
// ============================================================================

const ENVIRONMENTAL_GUIDES: GuideMetadata[] = [
  {
    code: 'G-ENV-001',
    titleKey: 'guides.GENV001.title',
    category: 'environmental',
    applicableRoles: [],
    relatedCodes: ['G-ENV-002', 'G-ENV-003', 'G-FS-007'],
    legalBasisKey: 'guides.GENV001.legalBasis',
  },
  {
    code: 'G-ENV-002',
    titleKey: 'guides.GENV002.title',
    category: 'environmental',
    applicableRoles: [],
    relatedCodes: ['G-ENV-001', 'G-ENV-003'],
    legalBasisKey: 'guides.GENV002.legalBasis',
  },
  {
    code: 'G-ENV-003',
    titleKey: 'guides.GENV003.title',
    category: 'environmental',
    applicableRoles: ['kitchen'],
    relatedCodes: ['G-ENV-001', 'G-ENV-002'],
    legalBasisKey: 'guides.GENV003.legalBasis',
  },
  {
    code: 'G-ENV-004',
    titleKey: 'guides.GENV004.title',
    category: 'environmental',
    applicableRoles: [],
    relatedCodes: ['G-ENV-001', 'G-ENV-005'],
    legalBasisKey: 'guides.GENV004.legalBasis',
  },
  {
    code: 'G-ENV-005',
    titleKey: 'guides.GENV005.title',
    category: 'environmental',
    applicableRoles: ['kitchen', 'bar', 'waiter'],
    relatedCodes: ['G-FS-007', 'G-ENV-001', 'G-ENV-002'],
    legalBasisKey: 'guides.GENV005.legalBasis',
  },
]

// ============================================================================
// ALL GUIDES COMBINED
// ============================================================================

export const GUIDES: GuideMetadata[] = [
  ...FOOD_SAFETY_GUIDES,
  ...OCCUPATIONAL_HEALTH_GUIDES,
  ...LABOR_REGULATIONS_GUIDES,
  ...ROLE_SPECIFIC_GUIDES,
  ...REQUIRED_DOCS_GUIDES,
  ...ENVIRONMENTAL_GUIDES,
]
