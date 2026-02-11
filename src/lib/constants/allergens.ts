/**
 * EU Mandatory Allergen Information
 * As per EU Regulation 1169/2011
 */

import { type LucideIcon, Wheat, Fish, Milk, Egg, Nut, Shell, Leaf, Sprout, FlaskConical, Circle } from 'lucide-react'

export type AllergenType =
  | 'celery'
  | 'crustaceans'
  | 'eggs'
  | 'fish'
  | 'gluten'
  | 'lupin'
  | 'milk'
  | 'molluscs'
  | 'mustard'
  | 'nuts'
  | 'peanuts'
  | 'sesame'
  | 'soy'
  | 'sulfites'

export interface AllergenInfo {
  id: AllergenType
  name_en: string
  name_nl: string
  name_es: string
  name_de: string
  icon: LucideIcon
  color: string
}

export const ALLERGENS: Record<AllergenType, AllergenInfo> = {
  gluten: {
    id: 'gluten',
    name_en: 'Gluten',
    name_nl: 'Gluten',
    name_es: 'Gluten',
    name_de: 'Gluten',
    icon: Wheat,
    color: 'text-amber-500',
  },
  crustaceans: {
    id: 'crustaceans',
    name_en: 'Crustaceans',
    name_nl: 'Schaaldieren',
    name_es: 'Crustáceos',
    name_de: 'Krebstiere',
    icon: Shell,
    color: 'text-orange-500',
  },
  eggs: {
    id: 'eggs',
    name_en: 'Eggs',
    name_nl: 'Eieren',
    name_es: 'Huevos',
    name_de: 'Eier',
    icon: Egg,
    color: 'text-yellow-500',
  },
  fish: {
    id: 'fish',
    name_en: 'Fish',
    name_nl: 'Vis',
    name_es: 'Pescado',
    name_de: 'Fisch',
    icon: Fish,
    color: 'text-blue-500',
  },
  peanuts: {
    id: 'peanuts',
    name_en: 'Peanuts',
    name_nl: 'Pinda\'s',
    name_es: 'Cacahuetes',
    name_de: 'Erdnüsse',
    icon: Nut,
    color: 'text-orange-700',
  },
  soy: {
    id: 'soy',
    name_en: 'Soy',
    name_nl: 'Soja',
    name_es: 'Soja',
    name_de: 'Soja',
    icon: Sprout,
    color: 'text-green-600',
  },
  milk: {
    id: 'milk',
    name_en: 'Milk',
    name_nl: 'Melk',
    name_es: 'Leche',
    name_de: 'Milch',
    icon: Milk,
    color: 'text-blue-300',
  },
  nuts: {
    id: 'nuts',
    name_en: 'Tree Nuts',
    name_nl: 'Noten',
    name_es: 'Frutos de cáscara',
    name_de: 'Schalenfrüchte',
    icon: Nut,
    color: 'text-brown-600',
  },
  celery: {
    id: 'celery',
    name_en: 'Celery',
    name_nl: 'Selderij',
    name_es: 'Apio',
    name_de: 'Sellerie',
    icon: Leaf,
    color: 'text-green-500',
  },
  mustard: {
    id: 'mustard',
    name_en: 'Mustard',
    name_nl: 'Mosterd',
    name_es: 'Mostaza',
    name_de: 'Senf',
    icon: Circle,
    color: 'text-yellow-600',
  },
  sesame: {
    id: 'sesame',
    name_en: 'Sesame',
    name_nl: 'Sesam',
    name_es: 'Sésamo',
    name_de: 'Sesam',
    icon: Circle,
    color: 'text-amber-600',
  },
  sulfites: {
    id: 'sulfites',
    name_en: 'Sulfites',
    name_nl: 'Sulfiet',
    name_es: 'Sulfitos',
    name_de: 'Sulfite',
    icon: FlaskConical,
    color: 'text-purple-500',
  },
  lupin: {
    id: 'lupin',
    name_en: 'Lupin',
    name_nl: 'Lupine',
    name_es: 'Altramuces',
    name_de: 'Lupinen',
    icon: Sprout,
    color: 'text-violet-500',
  },
  molluscs: {
    id: 'molluscs',
    name_en: 'Molluscs',
    name_nl: 'Weekdieren',
    name_es: 'Moluscos',
    name_de: 'Weichtiere',
    icon: Shell,
    color: 'text-pink-500',
  },
}

export const ALLERGEN_LIST: AllergenInfo[] = [
  ALLERGENS.gluten,
  ALLERGENS.crustaceans,
  ALLERGENS.eggs,
  ALLERGENS.fish,
  ALLERGENS.peanuts,
  ALLERGENS.soy,
  ALLERGENS.milk,
  ALLERGENS.nuts,
  ALLERGENS.celery,
  ALLERGENS.mustard,
  ALLERGENS.sesame,
  ALLERGENS.sulfites,
  ALLERGENS.lupin,
  ALLERGENS.molluscs,
]
