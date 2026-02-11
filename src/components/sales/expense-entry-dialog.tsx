'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
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
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { EXPENSE_CATEGORIES, getIVARateForCategory, calculateIVAFromTotal } from '@/lib/utils/spanish-tax'
import type { ExpenseEntry } from '@/types/expenses'

interface ExpenseEntryDialogProps {
  expense?: ExpenseEntry
  onSuccess?: () => void
}

export function ExpenseEntryDialog({ expense, onSuccess }: ExpenseEntryDialogProps) {
  const t = useTranslations('sales')
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const isEditing = !!expense

  // Form state
  const [date, setDate] = useState(expense?.date || new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState(expense?.category || '')
  const [description, setDescription] = useState(expense?.description || '')
  const [amount, setAmount] = useState(expense?.amount?.toString() || '')
  const [ivaRate, setIvaRate] = useState(expense?.iva_rate?.toString() || '21')
  const [baseImponible, setBaseImponible] = useState(expense?.base_imponible?.toString() || '')
  const [ivaAmount, setIvaAmount] = useState(expense?.iva_amount?.toString() || '')
  const [supplierNif, setSupplierNif] = useState(expense?.supplier_nif || '')
  const [facturaNumber, setFacturaNumber] = useState(expense?.factura_number || '')
  const [vendor, setVendor] = useState(expense?.vendor || '')
  const [paymentMethod, setPaymentMethod] = useState(expense?.payment_method || 'card')
  const [isDeductible, setIsDeductible] = useState(expense?.is_deductible ?? true)
  const [isRecurring, setIsRecurring] = useState(expense?.is_recurring ?? false)
  const [receiptUrl, setReceiptUrl] = useState(expense?.receipt_url || '')
  const [notes, setNotes] = useState(expense?.notes || '')

  // Auto-populate IVA rate when category changes
  useEffect(() => {
    if (category) {
      const rate = getIVARateForCategory(category)
      setIvaRate(rate.toString())
    }
  }, [category])

  // Auto-calculate base_imponible and iva_amount when amount or rate changes
  useEffect(() => {
    const amountNum = parseFloat(amount)
    const rateNum = parseFloat(ivaRate)
    if (!isNaN(amountNum) && amountNum > 0 && !isNaN(rateNum)) {
      const result = calculateIVAFromTotal(amountNum, rateNum)
      setBaseImponible(result.base_imponible.toFixed(2))
      setIvaAmount(result.iva_amount.toFixed(2))
    } else {
      setBaseImponible('')
      setIvaAmount('')
    }
  }, [amount, ivaRate])

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0])
    setCategory('')
    setDescription('')
    setAmount('')
    setIvaRate('21')
    setBaseImponible('')
    setIvaAmount('')
    setSupplierNif('')
    setFacturaNumber('')
    setVendor('')
    setPaymentMethod('card')
    setIsDeductible(true)
    setIsRecurring(false)
    setReceiptUrl('')
    setNotes('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!date || !category || !description || !amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields with valid values',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const payload = {
        date,
        category,
        description,
        amount: parseFloat(amount),
        iva_rate: parseFloat(ivaRate),
        iva_amount: parseFloat(ivaAmount) || undefined,
        base_imponible: parseFloat(baseImponible) || undefined,
        supplier_nif: supplierNif || undefined,
        factura_number: facturaNumber || undefined,
        vendor: vendor || undefined,
        payment_method: paymentMethod,
        is_deductible: isDeductible,
        is_recurring: isRecurring,
        receipt_url: receiptUrl || undefined,
        notes: notes || undefined,
      }

      const res = await fetch('/api/finance/overhead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save expense')
      }

      toast({
        title: isEditing ? t('expenses.expenseUpdated') : t('expenses.expenseCreated'),
        description: `${description} - ${parseFloat(amount).toFixed(2)}`,
      })

      resetForm()
      setOpen(false)
      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save expense',
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
          {t('expenses.addExpense')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? t('expenses.editExpense') : t('expenses.addExpense')}
            </DialogTitle>
            <DialogDescription>
              {t('expenses.subtitle')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Row 1: Date and Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expense-date">{t('expenses.date')}</Label>
                <Input
                  id="expense-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense-category">{t('expenses.category')}</Label>
                <Select
                  value={category}
                  onValueChange={setCategory}
                  disabled={loading}
                >
                  <SelectTrigger id="expense-category">
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label} ({cat.ivaRate}% IVA)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Description */}
            <div className="space-y-2">
              <Label htmlFor="expense-description">{t('expenses.description')}</Label>
              <Textarea
                id="expense-description"
                placeholder="Enter expense description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                required
                rows={2}
              />
            </div>

            {/* Row 3: Amount, IVA Rate, Base, IVA Amount */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expense-amount">{t('expenses.amount')} (&euro;)</Label>
                <Input
                  id="expense-amount"
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

              <div className="space-y-2">
                <Label htmlFor="expense-iva-rate">{t('expenses.ivaRate')} (%)</Label>
                <Input
                  id="expense-iva-rate"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={ivaRate}
                  onChange={(e) => setIvaRate(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense-base">{t('expenses.baseImponible')}</Label>
                <Input
                  id="expense-base"
                  type="number"
                  step="0.01"
                  value={baseImponible}
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense-iva-amount">{t('expenses.ivaAmount')}</Label>
                <Input
                  id="expense-iva-amount"
                  type="number"
                  step="0.01"
                  value={ivaAmount}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>

            {/* Row 4: Vendor, Supplier NIF, Factura # */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expense-vendor">{t('expenses.vendor')}</Label>
                <Input
                  id="expense-vendor"
                  placeholder="Vendor name"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense-nif">{t('expenses.supplierNif')}</Label>
                <Input
                  id="expense-nif"
                  placeholder="B12345678"
                  value={supplierNif}
                  onChange={(e) => setSupplierNif(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense-factura">{t('expenses.facturaNumber')}</Label>
                <Input
                  id="expense-factura"
                  placeholder="FAC-2026-001"
                  value={facturaNumber}
                  onChange={(e) => setFacturaNumber(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Row 5: Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expense-payment">{t('expenses.paymentMethod')}</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as "cash" | "card" | "transfer" | "other")}
                  disabled={loading}
                >
                  <SelectTrigger id="expense-payment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense-receipt">{t('expenses.receiptUrl')}</Label>
                <Input
                  id="expense-receipt"
                  type="text"
                  placeholder="https://..."
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Row 6: Checkboxes */}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="expense-deductible"
                  checked={isDeductible}
                  onCheckedChange={(checked) => setIsDeductible(checked === true)}
                  disabled={loading}
                />
                <Label htmlFor="expense-deductible" className="text-sm font-normal cursor-pointer">
                  {t('expenses.deductible')}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="expense-recurring"
                  checked={isRecurring}
                  onCheckedChange={(checked) => setIsRecurring(checked === true)}
                  disabled={loading}
                />
                <Label htmlFor="expense-recurring" className="text-sm font-normal cursor-pointer">
                  {t('expenses.recurring')}
                </Label>
              </div>
            </div>

            {/* Row 7: Notes */}
            <div className="space-y-2">
              <Label htmlFor="expense-notes">{t('expenses.notes')}</Label>
              <Textarea
                id="expense-notes"
                placeholder="Additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading}
                rows={2}
              />
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
            <Button
              type="submit"
              disabled={loading || !date || !category || !description || !amount}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? t('expenses.editExpense') : t('expenses.addExpense')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
