'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { BeerKegWithProduct, CreateBeerKegRequest } from '@/types'
import { BeerKegGrid, BeerKegStats } from '@/components/stock/beer-keg-grid'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Beer, Plus, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface BeerProduct {
  id: string
  name: string
  category: string
  serving_type?: 'draft' | 'bottle' | 'can' | null
}

export default function BeersPage() {
  const t = useTranslations('stock')
  const [kegs, setKegs] = useState<BeerKegWithProduct[]>([])
  const [beerProducts, setBeerProducts] = useState<BeerProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [tapDialogOpen, setTapDialogOpen] = useState(false)
  const [pourDialogOpen, setPourDialogOpen] = useState(false)
  const [selectedKeg, setSelectedKeg] = useState<BeerKegWithProduct | null>(null)
  const { toast } = useToast()

  // Form state for tapping new keg
  const [newKeg, setNewKeg] = useState<CreateBeerKegRequest>({
    product_id: '',
    keg_size_liters: 20,
    initial_liters: 20,
    notes: '',
  })

  // Form state for pouring beer
  const [pourAmount, setPourAmount] = useState<number>(0.5)

  const fetchKegs = async () => {
    try {
      const response = await fetch('/api/stock/kegs?active=true')
      if (!response.ok) throw new Error(t('beers.failedToLoadKegs'))
      const data = await response.json()
      setKegs(data)
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('beers.failedToLoadKegs'),
        variant: 'destructive',
      })
    }
  }

  const fetchBeerProducts = async () => {
    try {
      const response = await fetch('/api/stock/products')
      if (!response.ok) throw new Error(t('beers.failedToLoadBeerProducts'))
      const data = await response.json()
      // Filter for beer category
      const beers = data.filter((p: BeerProduct) => p.category === 'beer')
      setBeerProducts(beers)
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('beers.failedToLoadBeerProducts'),
        variant: 'destructive',
      })
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchKegs(), fetchBeerProducts()])
      setLoading(false)
    }
    loadData()
  }, [])

  const handleTapNewKeg = async () => {
    if (!newKeg.product_id) {
      toast({
        title: t('beers.validationError'),
        description: t('beers.selectBeerProduct'),
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch('/api/stock/kegs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKeg),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || t('beers.failedToTapKeg'))
      }

      const tappedKeg = await response.json()

      toast({
        title: t('beers.kegTapped'),
        description: t('beers.kegTappedDescription', { name: tappedKeg.product.name }),
      })

      setTapDialogOpen(false)
      setNewKeg({
        product_id: '',
        keg_size_liters: 20,
        initial_liters: 20,
        notes: '',
      })
      fetchKegs()
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('beers.failedToTapKeg'),
        variant: 'destructive',
      })
    }
  }

  const handlePourBeer = async () => {
    if (!selectedKeg || pourAmount <= 0) return

    try {
      const response = await fetch(`/api/stock/kegs/${selectedKeg.id}/pour`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liters_poured: pourAmount }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || t('beers.failedToPourBeer'))
      }

      const updatedKeg = await response.json()

      toast({
        title: t('beers.beerPoured'),
        description: t('beers.beerPouredDescription', { amount: pourAmount, name: selectedKeg.product.name, remaining: updatedKeg.current_liters.toFixed(1) }),
      })

      setPourDialogOpen(false)
      setSelectedKeg(null)
      setPourAmount(0.5)
      fetchKegs()
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('beers.failedToPourBeer'),
        variant: 'destructive',
      })
    }
  }

  const handleMarkEmpty = async (kegId: string) => {
    try {
      const response = await fetch(`/api/stock/kegs/${kegId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'empty', current_liters: 0 }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || t('beers.failedToMarkEmpty'))
      }

      toast({
        title: t('beers.markEmpty'),
        description: t('beers.empty'),
      })

      fetchKegs()
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('beers.failedToMarkEmpty'),
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex h-[50vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Beer className="h-8 w-8" />
            {t('beers.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('beers.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => fetchKegs()} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
          <Button onClick={() => setTapDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('beers.tapKeg')}
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <BeerKegStats kegs={kegs} />

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('beers.aboutBeerTracking')}</CardTitle>
          <CardDescription>
            {t('beers.trackLitersDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>{t('beers.automaticAlerts')}</strong> {t('beers.automaticAlertsDescription')}
          </p>
          <p>
            <strong>{t('beers.standardKegSizes')}</strong> {t('beers.standardKegSizesDescription')}
          </p>
          <p>
            <strong>{t('beers.statusIndicators')}</strong> {t('beers.statusIndicatorsDescription')}
          </p>
        </CardContent>
      </Card>

      {/* Keg Grid */}
      <BeerKegGrid
        kegs={kegs}
        onUpdateKeg={(keg) => {
          setSelectedKeg(keg)
          setPourDialogOpen(true)
        }}
        onMarkEmpty={handleMarkEmpty}
      />

      {/* Tap New Keg Dialog */}
      <Dialog open={tapDialogOpen} onOpenChange={setTapDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('beers.tapKeg')}</DialogTitle>
            <DialogDescription>
              {t('beers.addKeg')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="beer">{t('beers.beerProductLabel')}</Label>
              <Select
                value={newKeg.product_id}
                onValueChange={(value) =>
                  setNewKeg({ ...newKeg, product_id: value })
                }
              >
                <SelectTrigger id="beer">
                  <SelectValue placeholder={t('beers.selectBeer')} />
                </SelectTrigger>
                <SelectContent>
                  {beerProducts.filter(b => b.serving_type === 'draft').map((beer) => (
                    <SelectItem key={beer.id} value={beer.id}>
                      {beer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="keg_size">{t('beers.size')} *</Label>
                <Input
                  id="keg_size"
                  type="number"
                  min="1"
                  max="200"
                  step="0.1"
                  value={newKeg.keg_size_liters}
                  onChange={(e) =>
                    setNewKeg({
                      ...newKeg,
                      keg_size_liters: parseFloat(e.target.value) || 20,
                      initial_liters: parseFloat(e.target.value) || 20,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="initial_liters">{t('beers.litersRemaining')} *</Label>
                <Input
                  id="initial_liters"
                  type="number"
                  min="0"
                  step="0.1"
                  value={newKeg.initial_liters}
                  onChange={(e) =>
                    setNewKeg({
                      ...newKeg,
                      initial_liters: parseFloat(e.target.value) || 20,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t('beers.notesOptional')}</Label>
              <Textarea
                id="notes"
                placeholder={t('beers.notesPlaceholder')}
                value={newKeg.notes}
                onChange={(e) => setNewKeg({ ...newKeg, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTapDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleTapNewKeg}>{t('beers.tapKeg')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pour Beer Dialog */}
      <Dialog open={pourDialogOpen} onOpenChange={setPourDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('beers.tapKeg')}</DialogTitle>
            <DialogDescription>
              {selectedKeg
                ? t('beers.pourDescription', { name: selectedKeg.product.name })
                : t('beers.updateKegVolume')}
            </DialogDescription>
          </DialogHeader>

          {selectedKeg && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('beers.currentVolume')}
                  </span>
                  <span className="text-2xl font-bold">
                    {selectedKeg.current_liters.toFixed(1)}L
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('beers.percentRemaining', { percent: selectedKeg.percent_remaining })}
                  </span>
                  <span className="text-muted-foreground">
                    {t('beers.ofKegSize', { size: selectedKeg.keg_size_liters })}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pour_amount">{t('beers.litersToPour')}</Label>
                <Input
                  id="pour_amount"
                  type="number"
                  min="0.1"
                  max={selectedKeg.current_liters}
                  step="0.1"
                  value={pourAmount}
                  onChange={(e) => setPourAmount(parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  {t('beers.afterPouring', { remaining: Math.max(0, selectedKeg.current_liters - pourAmount).toFixed(1) })}
                </p>
              </div>

              {/* Quick pour buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPourAmount(0.3)}
                >
                  {t('beers.pourSmall')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPourAmount(0.5)}
                >
                  {t('beers.pourPint')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPourAmount(1)}
                >
                  {t('beers.pour1L')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPourAmount(5)}
                >
                  {t('beers.pour5L')}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPourDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handlePourBeer}>{t('beers.tapKeg')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
