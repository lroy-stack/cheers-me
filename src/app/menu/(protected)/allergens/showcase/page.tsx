'use client'

/**
 * Allergen Components Showcase
 * Development/testing page to visually verify all allergen components
 * Remove from production or protect with auth
 */

import { useState } from 'react'
import { AllergenLegend } from '@/components/menu/allergen-legend'
import { AllergenFilter } from '@/components/menu/allergen-filter'
import { AllergenBadges } from '@/components/menu/allergen-badges'
import { AllergenSelector } from '@/components/menu/allergen-selector'
import { type AllergenType } from '@/lib/constants/allergens'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function AllergenShowcasePage() {
  const [selectedAllergens, setSelectedAllergens] = useState<AllergenType[]>([
    'gluten',
    'milk',
    'eggs',
  ])
  const [filterAllergens, setFilterAllergens] = useState<AllergenType[]>([])
  const [language, setLanguage] = useState<'en' | 'nl' | 'es'>('en')

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Badge variant="outline" className="mb-2">Development Only</Badge>
        <h1 className="text-4xl font-bold tracking-tight">
          Allergen Components Showcase
        </h1>
        <p className="text-muted-foreground">
          Visual testing page for all allergen-related components
        </p>
      </div>

      {/* Language Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Language Selection</CardTitle>
          <CardDescription>All components support EN/NL/ES</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={language} onValueChange={(v) => setLanguage(v as any)}>
            <TabsList>
              <TabsTrigger value="en">🇬🇧 English</TabsTrigger>
              <TabsTrigger value="nl">🇳🇱 Nederlands</TabsTrigger>
              <TabsTrigger value="es">🇪🇸 Español</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* AllergenSelector */}
      <Card>
        <CardHeader>
          <CardTitle>AllergenSelector Component</CardTitle>
          <CardDescription>
            Used in menu item forms for selecting allergens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AllergenSelector
            value={selectedAllergens}
            onChange={setSelectedAllergens}
            language={language}
          />
          <div>
            <p className="text-sm font-medium mb-2">Selected Allergens (State):</p>
            <code className="text-xs bg-muted p-2 rounded block">
              {JSON.stringify(selectedAllergens, null, 2)}
            </code>
          </div>
        </CardContent>
      </Card>

      {/* AllergenBadges */}
      <Card>
        <CardHeader>
          <CardTitle>AllergenBadges Component</CardTitle>
          <CardDescription>
            Displays allergen icons with tooltips (hover to see names)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm font-medium mb-3">Size: Small</p>
            <AllergenBadges
              allergens={selectedAllergens}
              language={language}
              size="sm"
              showTooltip={true}
            />
          </div>
          <div>
            <p className="text-sm font-medium mb-3">Size: Medium</p>
            <AllergenBadges
              allergens={selectedAllergens}
              language={language}
              size="md"
              showTooltip={true}
            />
          </div>
          <div>
            <p className="text-sm font-medium mb-3">Size: Large</p>
            <AllergenBadges
              allergens={selectedAllergens}
              language={language}
              size="lg"
              showTooltip={true}
            />
          </div>
          <div>
            <p className="text-sm font-medium mb-3">Many Allergens (maxVisible=5)</p>
            <AllergenBadges
              allergens={[
                'gluten',
                'milk',
                'eggs',
                'fish',
                'nuts',
                'soy',
                'crustaceans',
                'celery',
              ]}
              language={language}
              size="md"
              maxVisible={5}
              showTooltip={true}
            />
          </div>
        </CardContent>
      </Card>

      {/* AllergenFilter */}
      <Card>
        <CardHeader>
          <CardTitle>AllergenFilter Component</CardTitle>
          <CardDescription>
            Filter menu items by excluding allergens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AllergenFilter
            value={filterAllergens}
            onChange={setFilterAllergens}
            language={language}
          />
          <div>
            <p className="text-sm font-medium mb-2">Excluded Allergens (State):</p>
            <code className="text-xs bg-muted p-2 rounded block">
              {JSON.stringify(filterAllergens, null, 2)}
            </code>
          </div>
        </CardContent>
      </Card>

      {/* AllergenLegend - Compact */}
      <Card>
        <CardHeader>
          <CardTitle>AllergenLegend Component (Compact)</CardTitle>
          <CardDescription>
            Compact grid view of all allergens
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AllergenLegend language={language} compact={true} />
        </CardContent>
      </Card>

      {/* AllergenLegend - Full */}
      <div>
        <h2 className="text-2xl font-bold mb-4">AllergenLegend Component (Full Card)</h2>
        <AllergenLegend language={language} />
      </div>

      {/* AllergenLegend - Highlighted */}
      <div>
        <h2 className="text-2xl font-bold mb-4">
          AllergenLegend with Highlighted Allergens
        </h2>
        <AllergenLegend
          language={language}
          highlightAllergens={selectedAllergens}
        />
      </div>

      {/* Mock Menu Item Card */}
      <Card>
        <CardHeader>
          <CardTitle>Example: Menu Item Card with Allergens</CardTitle>
          <CardDescription>
            How allergens appear on a menu item card
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 space-y-3 max-w-sm">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-lg">Eggs Benedict</h3>
              <p className="text-lg font-bold text-primary">€12.50</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Poached eggs on toasted English muffin with hollandaise sauce and smoked salmon
            </p>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Contains allergens:</p>
              <AllergenBadges
                allergens={['gluten', 'eggs', 'milk', 'fish']}
                language={language}
                size="md"
                showTooltip={true}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Component Props Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Component Props Reference</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">AllergenSelector</h4>
            <code className="text-xs bg-muted p-2 rounded block whitespace-pre">
{`<AllergenSelector
  value={AllergenType[]}
  onChange={(allergens) => void}
  language="en" | "nl" | "es"
/>`}
            </code>
          </div>
          <div>
            <h4 className="font-semibold mb-2">AllergenBadges</h4>
            <code className="text-xs bg-muted p-2 rounded block whitespace-pre">
{`<AllergenBadges
  allergens={AllergenType[]}
  language="en" | "nl" | "es"
  size="sm" | "md" | "lg"
  maxVisible={number}
  showTooltip={boolean}
/>`}
            </code>
          </div>
          <div>
            <h4 className="font-semibold mb-2">AllergenFilter</h4>
            <code className="text-xs bg-muted p-2 rounded block whitespace-pre">
{`<AllergenFilter
  value={AllergenType[]}
  onChange={(allergens) => void}
  language="en" | "nl" | "es"
/>`}
            </code>
          </div>
          <div>
            <h4 className="font-semibold mb-2">AllergenLegend</h4>
            <code className="text-xs bg-muted p-2 rounded block whitespace-pre">
{`<AllergenLegend
  language="en" | "nl" | "es"
  compact={boolean}
  highlightAllergens={AllergenType[]}
/>`}
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground py-8">
        <p>Allergen Components Showcase - Development/Testing Only</p>
        <p className="mt-2">Remove this page from production or protect with authentication</p>
      </div>
    </div>
  )
}
