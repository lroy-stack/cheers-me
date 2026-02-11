import {
  Coffee,
  Beef,
  UtensilsCrossed,
  Salad,
  Cake,
  ChefHat,
  Wine,
  GlassWater,
  Beer,
  CupSoda,
  type LucideIcon,
} from 'lucide-react'

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Breakfast & Lunch': Coffee,
  'Burgers & Schnitzel': Beef,
  'Pasta': UtensilsCrossed,
  'Salads': Salad,
  'Desserts': Cake,
  'Sauces & Sides': ChefHat,
  'Classic Cocktails': Wine,
  'Coffee Cocktails': Coffee,
  'Spritz & Sangria': GlassWater,
  'Beers': Beer,
  'Wines & Champagne': Wine,
  'Soft Drinks': CupSoda,
}

export function getCategoryIcon(categoryName: string): LucideIcon {
  return CATEGORY_ICONS[categoryName] || UtensilsCrossed
}
