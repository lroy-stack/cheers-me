'use client'

import { ReactNode, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Euro, Printer, FileDown, Pencil } from 'lucide-react'
import { GlassTypeIcon } from './glass-type-icon'
import { FlavorProfileBadges } from './flavor-profile-badge'
import { FlavorRadar } from './flavor-radar'
import { DifficultyIndicator } from './difficulty-indicator'
import { CostBreakdown } from './cost-breakdown'
import { RecipePrintSheet } from './recipe-print-sheet'
import type { CocktailMenuItem } from './cocktail-card'

interface CocktailDetailDialogProps {
  item: CocktailMenuItem
  language: 'en' | 'nl' | 'es' | 'de'
  children: ReactNode
  canEdit?: boolean
  showCosts?: boolean
  onEditMetadata?: () => void
  onEditIngredients?: () => void
  onEditSteps?: () => void
}

export function CocktailDetailDialog({
  item,
  language,
  children,
  canEdit = false,
  showCosts = false,
  onEditMetadata,
  onEditIngredients,
  onEditSteps,
}: CocktailDetailDialogProps) {
  const name = item[`name_${language}`] || item.name_en
  const description = item[`description_${language}`] || item.description_en
  const [stepLang, setStepLang] = useState(language)
  const printRef = useRef<HTMLDivElement>(null)

  const getStepInstruction = (step: NonNullable<CocktailMenuItem['steps']>[number], lang: string) => {
    const key = `instruction_${lang}` as keyof typeof step
    return (step[key] as string) || step.instruction_en
  }

  const translations = {
    overview: { en: 'Overview', nl: 'Overzicht', es: 'Resumen', de: 'Übersicht' },
    ingredients: { en: 'Ingredients', nl: 'Ingrediënten', es: 'Ingredientes', de: 'Zutaten' },
    preparation: { en: 'Preparation', nl: 'Bereiding', es: 'Preparación', de: 'Zubereitung' },
    garnish: { en: 'Garnish', nl: 'Garnering', es: 'Decoración', de: 'Garnitur' },
    glass: { en: 'Glass', nl: 'Glas', es: 'Vaso', de: 'Glas' },
    method: { en: 'Method', nl: 'Methode', es: 'Método', de: 'Methode' },
    tip: { en: 'Tip', nl: 'Tip', es: 'Consejo', de: 'Tipp' },
    price: { en: 'Price', nl: 'Prijs', es: 'Precio', de: 'Preis' },
    optional: { en: 'optional', nl: 'optioneel', es: 'opcional', de: 'optional' },
    edit: { en: 'Edit', nl: 'Bewerken', es: 'Editar', de: 'Bearbeiten' },
    print: { en: 'Print', nl: 'Afdrukken', es: 'Imprimir', de: 'Drucken' },
  }

  const t = (key: keyof typeof translations) => translations[key][language] || translations[key].en

  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${name} — Recipe</title>
          <style>
            body { font-family: system-ui, sans-serif; margin: 0; padding: 2rem; color: #1a1a2e; }
            .header { border-bottom: 2px solid #722F37; padding-bottom: 1rem; margin-bottom: 1.5rem; }
            .brand { font-size: 0.75rem; letter-spacing: 0.3em; color: #722F37; text-transform: uppercase; }
            h1 { font-size: 1.8rem; margin: 0.5rem 0; }
            .signature { display: inline-block; padding: 0.15rem 0.5rem; font-size: 0.7rem; font-weight: bold; background: #722F37; color: white; border-radius: 3px; }
            .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; font-size: 0.85rem; }
            .meta-label { font-weight: 600; color: #722F37; }
            h2 { font-size: 1.1rem; color: #722F37; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 0.75rem; }
            .ing-row { display: flex; justify-content: space-between; padding: 0.3rem 0; border-bottom: 1px solid #eee; font-size: 0.85rem; }
            .step { display: flex; gap: 0.75rem; margin-bottom: 0.75rem; }
            .step-num { width: 1.5rem; height: 1.5rem; border-radius: 50%; background: #722F37; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold; flex-shrink: 0; }
            .step-text { font-size: 0.85rem; }
            .tip { font-size: 0.75rem; color: #c9a84c; font-style: italic; }
            .footer { border-top: 2px solid #722F37; padding-top: 0.75rem; margin-top: 2rem; display: flex; justify-content: space-between; align-items: center; }
            .footer-brand { font-size: 0.7rem; color: #999; }
            .price { font-size: 1.5rem; font-weight: bold; color: #722F37; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">GrandCafe Cheers — El Arenal, Mallorca</div>
            <h1>${name}</h1>
            ${item.is_signature ? '<span class="signature">SIGNATURE</span>' : ''}
            ${description ? `<p style="color: #666; font-size: 0.85rem; margin-top: 0.5rem;">${description}</p>` : ''}
          </div>
          <div class="meta-grid">
            ${item.glass_type ? `<div><div class="meta-label">Glass</div><div>${item.glass_type.replace(/_/g, ' ')}</div></div>` : ''}
            ${item.preparation_method ? `<div><div class="meta-label">Method</div><div>${item.preparation_method}</div></div>` : ''}
            ${item.difficulty_level ? `<div><div class="meta-label">Difficulty</div><div>${item.difficulty_level}</div></div>` : ''}
            ${item.base_spirit ? `<div><div class="meta-label">Spirit</div><div>${item.base_spirit}</div></div>` : ''}
          </div>
          ${item.ingredients?.length ? `
            <h2>Ingredients</h2>
            ${item.ingredients.map(ing => `
              <div class="ing-row">
                <span${ing.is_garnish ? ' style="font-style:italic;color:#999"' : ''}>${ing.name}${ing.is_optional ? ' <small style="color:#aaa">(optional)</small>' : ''}</span>
                <span style="color:#666">${ing.quantity} ${ing.unit}</span>
              </div>
            `).join('')}
          ` : ''}
          ${item.steps?.length ? `
            <h2 style="margin-top:1.5rem">Preparation</h2>
            ${item.steps.map(step => `
              <div class="step">
                <div class="step-num">${step.step_number}</div>
                <div>
                  <div class="step-text">${getStepInstruction(step, language)}</div>
                  ${step.tip ? `<div class="tip">Tip: ${step.tip}</div>` : ''}
                </div>
              </div>
            `).join('')}
          ` : ''}
          <div class="footer">
            <div class="footer-brand">GrandCafe Cheers — Carrer de la Platja de Palma, El Arenal, Mallorca</div>
            <div class="price">€${item.price.toFixed(2)}</div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {item.glass_type && <GlassTypeIcon glassType={item.glass_type} size="lg" />}
            <div>
              <DialogTitle className="text-2xl">{name}</DialogTitle>
              <DialogDescription className="text-base">
                {item.base_spirit && <span>{item.base_spirit}</span>}
                {item.is_signature && (
                  <Badge className="ml-2 bg-primary text-white">Signature</Badge>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
            <TabsTrigger value="ingredients">{t('ingredients')}</TabsTrigger>
            <TabsTrigger value="steps">{t('preparation')}</TabsTrigger>
          </TabsList>

          {/* ═══ OVERVIEW TAB ═══ */}
          <TabsContent value="overview" className="space-y-5 mt-4">
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}

            {/* Glass & Method cards */}
            <div className="grid grid-cols-2 gap-4">
              {item.glass_type && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                  <GlassTypeIcon glassType={item.glass_type} size="md" showLabel />
                  <span className="text-sm font-medium">{t('glass')}</span>
                </div>
              )}
              {item.preparation_method && (
                <div className="p-3 rounded-lg bg-muted">
                  <span className="text-sm font-medium">{t('method')}: </span>
                  <span className="text-sm capitalize">{item.preparation_method}</span>
                </div>
              )}
            </div>

            {/* Flavor radar + badges */}
            <div className="flex items-start gap-4">
              {item.flavor_profiles && item.flavor_profiles.length > 0 && (
                <>
                  <FlavorRadar flavors={item.flavor_profiles} size={150} />
                  <div className="flex-1">
                    <FlavorProfileBadges flavors={item.flavor_profiles} max={12} />
                  </div>
                </>
              )}
            </div>

            {/* Difficulty */}
            {item.difficulty_level && (
              <DifficultyIndicator level={item.difficulty_level} showLabel />
            )}

            {/* Garnish */}
            {item.garnish && (
              <div className="p-3 rounded-lg bg-muted">
                <span className="text-sm font-medium">{t('garnish')}: </span>
                <span className="text-sm">{item.garnish}</span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center justify-between py-4 border-t border-b">
              <span className="text-lg font-medium">{t('price')}</span>
              <div className="text-3xl font-bold text-primary flex items-center gap-1">
                <Euro className="h-6 w-6" />
                {item.price.toFixed(2)}
              </div>
            </div>

            {canEdit && onEditMetadata && (
              <Button variant="outline" size="sm" onClick={onEditMetadata}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                {t('edit')}
              </Button>
            )}
          </TabsContent>

          {/* ═══ INGREDIENTS TAB ═══ */}
          <TabsContent value="ingredients" className="space-y-4 mt-4">
            {showCosts && item.ingredients && item.ingredients.length > 0 ? (
              <CostBreakdown
                ingredients={item.ingredients.map(ing => ({
                  ...ing,
                  cost_per_unit: (ing as Record<string, unknown>).cost_per_unit as number | undefined,
                }))}
                sellingPrice={item.price}
              />
            ) : item.ingredients && item.ingredients.length > 0 ? (
              <div className="space-y-2">
                {item.ingredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                    <span className={ing.is_garnish ? 'italic text-muted-foreground' : ''}>
                      {ing.name}
                      {ing.is_optional && (
                        <span className="text-xs text-muted-foreground ml-1">({t('optional')})</span>
                      )}
                    </span>
                    <span className="text-muted-foreground">
                      {ing.quantity} {ing.unit}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No ingredients listed.</p>
            )}

            {canEdit && onEditIngredients && (
              <Button variant="outline" size="sm" onClick={onEditIngredients}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                {t('edit')} {t('ingredients')}
              </Button>
            )}
          </TabsContent>

          {/* ═══ STEPS TAB ═══ */}
          <TabsContent value="steps" className="space-y-4 mt-4">
            {/* Language toggle for steps */}
            <div className="flex gap-1">
              {(['en', 'nl', 'es', 'de'] as const).map(lang => (
                <Button
                  key={lang}
                  variant={stepLang === lang ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2 text-xs uppercase"
                  onClick={() => setStepLang(lang)}
                >
                  {lang}
                </Button>
              ))}
            </div>

            {item.steps && item.steps.length > 0 ? (
              <div className="space-y-3">
                {item.steps.map((step) => (
                  <div key={step.step_number} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      {step.step_number}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{getStepInstruction(step, stepLang)}</p>
                      {step.tip && (
                        <p className="text-xs text-primary mt-1 italic">
                          {t('tip')}: {step.tip}
                        </p>
                      )}
                      {step.duration_seconds && (
                        <span className="text-xs text-muted-foreground">~{step.duration_seconds}s</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No preparation steps listed.</p>
            )}

            {canEdit && onEditSteps && (
              <Button variant="outline" size="sm" onClick={onEditSteps}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                {t('edit')} {t('preparation')}
              </Button>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer actions */}
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            {t('print')}
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <FileDown className="h-3.5 w-3.5 mr-1.5" />
            PDF
          </Button>
        </div>

        {/* Hidden print content */}
        <RecipePrintSheet ref={printRef} item={item} language={language} />
      </DialogContent>
    </Dialog>
  )
}
