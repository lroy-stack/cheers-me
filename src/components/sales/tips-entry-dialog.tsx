'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Shift {
  id: string
  date: string
  shift_type: string
  start_time: string
  end_time: string
  employee_id: string
  employee: {
    id: string
    profile: {
      full_name: string
    }
  }
}

interface TipsEntryDialogProps {
  shifts: Shift[]
  onSuccess?: () => void
}

export function TipsEntryDialog({ shifts, onSuccess }: TipsEntryDialogProps) {
  const t = useTranslations('sales')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedShiftId, setSelectedShiftId] = useState('')
  const [amount, setAmount] = useState('')
  const { toast } = useToast()

  const selectedShift = shifts.find(s => s.id === selectedShiftId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedShiftId || !amount || parseFloat(amount) < 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select a shift and enter a valid tip amount',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/sales/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shift_id: selectedShiftId,
          employee_id: selectedShift?.employee_id,
          amount: parseFloat(amount),
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to record tip')
      }

      toast({
        title: 'Tip Recorded',
        description: `Successfully recorded €${parseFloat(amount).toFixed(2)} for ${selectedShift?.employee.profile.full_name}`,
      })

      // Reset form
      setSelectedShiftId('')
      setAmount('')
      setOpen(false)

      // Call success callback
      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to record tip',
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
          Add Tip
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('tips.title')}</DialogTitle>
            <DialogDescription>
              {t('tips.subtitle')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Shift Selection */}
            <div className="space-y-2">
              <Label htmlFor="shift">Select Shift</Label>
              <Select
                value={selectedShiftId}
                onValueChange={setSelectedShiftId}
                disabled={loading}
              >
                <SelectTrigger id="shift">
                  <SelectValue placeholder="Choose a shift..." />
                </SelectTrigger>
                <SelectContent>
                  {shifts.length === 0 ? (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      No shifts available today
                    </div>
                  ) : (
                    shifts.map((shift) => (
                      <SelectItem key={shift.id} value={shift.id}>
                        {shift.employee.profile.full_name} - {shift.shift_type} ({shift.start_time} - {shift.end_time})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount">{t('tips.amount')} (€)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {/* Selected Employee Info */}
            {selectedShift && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium">{selectedShift.employee.profile.full_name}</p>
                <p className="text-muted-foreground text-xs mt-1">
                  {selectedShift.shift_type} shift • {selectedShift.date}
                </p>
              </div>
            )}
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
            <Button type="submit" disabled={loading || !selectedShiftId || !amount}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Record Tip
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
