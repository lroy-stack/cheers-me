'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Save, X } from 'lucide-react'
import type { GlassType, PreparationMethod, DifficultyLevel, FlavorProfile } from '@/types'

const GLASS_TYPES: GlassType[] = [
  'rocks', 'highball', 'coupe', 'martini', 'collins', 'hurricane',
  'wine', 'champagne_flute', 'copper_mug', 'tiki', 'shot', 'beer_glass', 'snifter', 'irish_coffee',
]

const PREP_METHODS: PreparationMethod[] = ['shaken', 'stirred', 'built', 'blended', 'layered', 'muddled', 'thrown']

const DIFFICULTY_LEVELS: DifficultyLevel[] = ['easy', 'medium', 'advanced']

const ALL_FLAVORS: FlavorProfile[] = [
  'sweet', 'sour', 'bitter', 'spirit_forward', 'tropical', 'refreshing',
  'creamy', 'spicy', 'herbal', 'smoky', 'fruity', 'coffee',
]

interface RecipeMetadataEditorProps {
  initialData: {
    glass_type?: GlassType
    preparation_method?: PreparationMethod
    difficulty_level?: DifficultyLevel
    base_spirit?: string
    garnish?: string
    flavor_profiles?: FlavorProfile[]
    is_signature?: boolean
    video_url?: string
  }
  onSave: (data: Record<string, unknown>) => Promise<{ success: boolean }>
  onCancel: () => void
  saving?: boolean
}

export function RecipeMetadataEditor({ initialData, onSave, onCancel, saving }: RecipeMetadataEditorProps) {
  const [glassType, setGlassType] = useState<string>(initialData.glass_type || '')
  const [prepMethod, setPrepMethod] = useState<string>(initialData.preparation_method || '')
  const [difficulty, setDifficulty] = useState<string>(initialData.difficulty_level || '')
  const [baseSpirit, setBaseSpirit] = useState(initialData.base_spirit || '')
  const [garnish, setGarnish] = useState(initialData.garnish || '')
  const [flavors, setFlavors] = useState<FlavorProfile[]>(initialData.flavor_profiles || [])
  const [isSignature, setIsSignature] = useState(initialData.is_signature || false)
  const [videoUrl, setVideoUrl] = useState(initialData.video_url || '')

  const toggleFlavor = (f: FlavorProfile) => {
    setFlavors(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])
  }

  const handleSave = async () => {
    await onSave({
      glass_type: glassType || null,
      preparation_method: prepMethod || null,
      difficulty_level: difficulty || null,
      base_spirit: baseSpirit || null,
      garnish: garnish || null,
      flavor_profiles: flavors,
      is_signature: isSignature,
      video_url: videoUrl || null,
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Glass Type</Label>
          <Select value={glassType} onValueChange={setGlassType}>
            <SelectTrigger>
              <SelectValue placeholder="Select glass" />
            </SelectTrigger>
            <SelectContent>
              {GLASS_TYPES.map(g => (
                <SelectItem key={g} value={g} className="capitalize">
                  {g.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Preparation Method</Label>
          <Select value={prepMethod} onValueChange={setPrepMethod}>
            <SelectTrigger>
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              {PREP_METHODS.map(m => (
                <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Difficulty</Label>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger>
              <SelectValue placeholder="Select difficulty" />
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTY_LEVELS.map(d => (
                <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Base Spirit</Label>
          <Input value={baseSpirit} onChange={e => setBaseSpirit(e.target.value)} placeholder="e.g. Vodka" />
        </div>

        <div className="space-y-1.5 col-span-2">
          <Label>Garnish</Label>
          <Input value={garnish} onChange={e => setGarnish(e.target.value)} placeholder="e.g. Lime wedge, mint sprig" />
        </div>

        <div className="space-y-1.5 col-span-2">
          <Label>Video URL</Label>
          <Input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://..." />
        </div>
      </div>

      {/* Flavor profiles */}
      <div className="space-y-1.5">
        <Label>Flavor Profiles</Label>
        <div className="flex flex-wrap gap-1.5">
          {ALL_FLAVORS.map(f => (
            <Badge
              key={f}
              variant={flavors.includes(f) ? 'default' : 'outline'}
              className="cursor-pointer capitalize"
              onClick={() => toggleFlavor(f)}
            >
              {f.replace(/_/g, ' ')}
            </Badge>
          ))}
        </div>
      </div>

      {/* Signature toggle */}
      <div className="flex items-center gap-2">
        <Switch checked={isSignature} onCheckedChange={setIsSignature} />
        <Label>Signature Cocktail</Label>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} disabled={saving} size="sm">
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-3.5 w-3.5 mr-1.5" />
          Cancel
        </Button>
      </div>
    </div>
  )
}
