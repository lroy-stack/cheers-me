'use client'

import { forwardRef } from 'react'
import type { CocktailMenuItem } from './cocktail-card'

interface RecipePrintSheetProps {
  item: CocktailMenuItem
  language: 'en' | 'nl' | 'es' | 'de'
}

export const RecipePrintSheet = forwardRef<HTMLDivElement, RecipePrintSheetProps>(
  function RecipePrintSheet({ item, language }, ref) {
    const name = item[`name_${language}`] || item.name_en
    const description = item[`description_${language}`] || item.description_en

    const getStepInstruction = (step: NonNullable<CocktailMenuItem['steps']>[number]) => {
      const key = `instruction_${language}` as keyof typeof step
      return (step[key] as string) || step.instruction_en
    }

    return (
      <div ref={ref} className="hidden print:block p-8 max-w-[210mm] mx-auto bg-white text-black">
        {/* Header */}
        <div className="border-b-2 border-[#722F37] pb-4 mb-6">
          <div className="text-xs tracking-[0.3em] text-[#722F37] uppercase mb-1">
            GrandCafe Cheers — El Arenal, Mallorca
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
          {item.is_signature && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-bold bg-[#722F37] text-white rounded">
              SIGNATURE
            </span>
          )}
          {description && (
            <p className="mt-2 text-sm text-gray-600">{description}</p>
          )}
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-4 gap-4 mb-6 text-sm">
          {item.glass_type && (
            <div>
              <div className="font-semibold text-[#722F37]">Glass</div>
              <div className="capitalize">{item.glass_type.replace(/_/g, ' ')}</div>
            </div>
          )}
          {item.preparation_method && (
            <div>
              <div className="font-semibold text-[#722F37]">Method</div>
              <div className="capitalize">{item.preparation_method}</div>
            </div>
          )}
          {item.difficulty_level && (
            <div>
              <div className="font-semibold text-[#722F37]">Difficulty</div>
              <div className="capitalize">{item.difficulty_level}</div>
            </div>
          )}
          {item.base_spirit && (
            <div>
              <div className="font-semibold text-[#722F37]">Base Spirit</div>
              <div>{item.base_spirit}</div>
            </div>
          )}
        </div>

        {/* Flavors */}
        {item.flavor_profiles && item.flavor_profiles.length > 0 && (
          <div className="mb-6 text-xs text-gray-500">
            Flavors: {item.flavor_profiles.join(', ')}
          </div>
        )}

        {/* Ingredients */}
        {item.ingredients && item.ingredients.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[#722F37] mb-3 tracking-[0.15em] uppercase">
              Ingredients
            </h2>
            <div className="space-y-1">
              {item.ingredients.map((ing, idx) => (
                <div key={idx} className="flex justify-between text-sm py-1 border-b border-gray-100">
                  <span className={ing.is_garnish ? 'italic text-gray-500' : ''}>
                    {ing.name}
                    {ing.is_optional && <span className="text-xs text-gray-400 ml-1">(optional)</span>}
                  </span>
                  <span className="text-gray-600">{ing.quantity} {ing.unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Steps */}
        {item.steps && item.steps.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[#722F37] mb-3 tracking-[0.15em] uppercase">
              Preparation
            </h2>
            <div className="space-y-3">
              {item.steps.map((step) => (
                <div key={step.step_number} className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#722F37] text-white flex items-center justify-center text-xs font-bold">
                    {step.step_number}
                  </div>
                  <div className="flex-1 text-sm">
                    <p>{getStepInstruction(step)}</p>
                    {step.tip && (
                      <p className="text-xs text-[#c9a84c] mt-0.5 italic">Tip: {step.tip}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Garnish */}
        {item.garnish && (
          <div className="mb-6 text-sm">
            <span className="font-semibold text-[#722F37]">Garnish: </span>
            {item.garnish}
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 border-[#722F37] pt-3 mt-8 flex justify-between items-center">
          <div className="text-xs text-gray-400">
            GrandCafe Cheers — Carrer de la Platja de Palma, El Arenal, Mallorca
          </div>
          <div className="text-2xl font-bold text-[#722F37]">
            €{item.price.toFixed(2)}
          </div>
        </div>
      </div>
    )
  }
)
