'use client'

import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts'
import type { FlavorProfile } from '@/types'

const ALL_FLAVORS: FlavorProfile[] = [
  'sweet', 'sour', 'bitter', 'spirit_forward', 'tropical', 'refreshing',
  'creamy', 'spicy', 'herbal', 'smoky', 'fruity', 'coffee',
]

const FLAVOR_LABELS: Record<FlavorProfile, string> = {
  sweet: 'Sweet',
  sour: 'Sour',
  bitter: 'Bitter',
  spirit_forward: 'Spirit',
  tropical: 'Tropical',
  refreshing: 'Fresh',
  creamy: 'Creamy',
  spicy: 'Spicy',
  herbal: 'Herbal',
  smoky: 'Smoky',
  fruity: 'Fruity',
  coffee: 'Coffee',
}

interface FlavorRadarProps {
  flavors: FlavorProfile[]
  size?: number
}

export function FlavorRadar({ flavors, size = 150 }: FlavorRadarProps) {
  const activeSet = new Set(flavors)
  const data = ALL_FLAVORS.map(f => ({
    flavor: FLAVOR_LABELS[f],
    value: activeSet.has(f) ? 1 : 0,
  }))

  return (
    <div style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="flavor"
            tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
          />
          <Radar
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.2}
            strokeWidth={1.5}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
