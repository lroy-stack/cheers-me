'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface DailySalesEntryDialogProps {
  onSuccess?: () => void
}

export function DailySalesEntryDialog({ onSuccess }: DailySalesEntryDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [foodRevenue, setFoodRevenue] = useState('')
  const [drinksRevenue, setDrinksRevenue] = useState('')
  const [cocktailsRevenue, setCocktailsRevenue] = useState('')
  const [dessertsRevenue, setDessertsRevenue] = useState('')
  const [otherRevenue, setOtherRevenue] = useState('')
  const [tips, setTips] = useState('')
  const [ticketCount, setTicketCount] = useState('')

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0])
    setFoodRevenue('')
    setDrinksRevenue('')
    setCocktailsRevenue('')
    setDessertsRevenue('')
    setOtherRevenue('')
    setTips('')
    setTicketCount('')
  }

  const total =
    (parseFloat(foodRevenue) || 0) +
    (parseFloat(drinksRevenue) || 0) +
    (parseFloat(cocktailsRevenue) || 0) +
    (parseFloat(dessertsRevenue) || 0) +
    (parseFloat(otherRevenue) || 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!date || total <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a date and at least one revenue value',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/sales/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          food_revenue: parseFloat(foodRevenue) || 0,
          drinks_revenue: parseFloat(drinksRevenue) || 0,
          cocktails_revenue: parseFloat(cocktailsRevenue) || 0,
          desserts_revenue: parseFloat(dessertsRevenue) || 0,
          other_revenue: parseFloat(otherRevenue) || 0,
          tips: parseFloat(tips) || 0,
          ticket_count: parseInt(ticketCount) || 0,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save daily sales')
      }

      toast({
        title: 'Sales Recorded',
        description: `Daily sales of €${total.toFixed(2)} saved for ${date}`,
      })

      resetForm()
      setOpen(false)
      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save daily sales',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Daily Sales
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Daily Sales</DialogTitle>
            <DialogDescription>
              Enter revenue by category for the selected date
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sales-date">Date</Label>
              <Input
                id="sales-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="food-revenue">Food (&euro;)</Label>
                <Input
                  id="food-revenue"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={foodRevenue}
                  onChange={(e) => setFoodRevenue(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="drinks-revenue">Drinks (&euro;)</Label>
                <Input
                  id="drinks-revenue"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={drinksRevenue}
                  onChange={(e) => setDrinksRevenue(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cocktails-revenue">Cocktails (&euro;)</Label>
                <Input
                  id="cocktails-revenue"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={cocktailsRevenue}
                  onChange={(e) => setCocktailsRevenue(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desserts-revenue">Desserts (&euro;)</Label>
                <Input
                  id="desserts-revenue"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={dessertsRevenue}
                  onChange={(e) => setDessertsRevenue(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="other-revenue">Other (&euro;)</Label>
              <Input
                id="other-revenue"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={otherRevenue}
                onChange={(e) => setOtherRevenue(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tips">Tips (&euro;)</Label>
                <Input
                  id="tips"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={tips}
                  onChange={(e) => setTips(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticket-count">Ticket Count</Label>
                <Input
                  id="ticket-count"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  value={ticketCount}
                  onChange={(e) => setTicketCount(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">&euro;{total.toFixed(2)}</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || total <= 0}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Daily Sales
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
