/**
 * Business Resources Registry
 * Central registry of all business resources accessible to the AI assistant.
 */

export const BUSINESS_RESOURCES = {
  training: {
    categories: [
      'food_safety',
      'occupational_health',
      'labor_regulations',
      'role_specific',
      'required_docs',
      'environmental',
    ] as const,
    guideContentApi: '/api/staff/training/guide-content/{guideCode}',
    complianceApi: '/api/staff/training/compliance',
    totalGuides: 74,
  },
  tasks: {
    templatesApi: '/api/staff/tasks/templates',
    tasksApi: '/api/staff/tasks',
  },
  schedule: {
    plansApi: '/api/staff/schedule-plans',
    shiftsApi: '/api/staff/shifts',
    leaveApi: '/api/staff/leave',
    shiftTypes: {
      morning: { start: '10:30', end: '17:00', hours: 6.5 },
      afternoon: { start: '17:00', end: '23:00', hours: 6 },
      night: { start: '23:00', end: '03:00', hours: 4 },
      split: { start: '10:30', end: '15:00', hours: 4.5, split_end: '20:00-01:00' },
    },
  },
  tax_forms: {
    modelo_303: 'src/lib/tax-forms/modelo_303_iva.html',
    modelo_111: 'src/lib/tax-forms/modelo_111_irpf.html',
    modelo_347: 'src/lib/tax-forms/modelo_347_operaciones.html',
  },
  brand: {
    logo: '/icons/logoheader.png',
    name: 'GrandCafe Cheers',
    location: 'El Arenal (Platja de Palma), Mallorca 07600',
    address: 'Carrer de Cartago 22, El Arenal (Platja de Palma), Mallorca 07600',
    phone: '+34 871 234 567',
    colors: {
      primary: '0.3800 0.1523 18.6219',
      accent: '0.4490 0.1606 17.6053',
    },
    social: {
      instagram: '@cheersmallorca',
      facebook: 'Grandcafe Cheers Mallorca',
    },
  },
} as const

export type TrainingCategory = (typeof BUSINESS_RESOURCES.training.categories)[number]
