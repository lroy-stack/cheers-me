'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'
import { useTranslations } from 'next-intl'

const seatGuestSchema = z.object({
  table_id: z.string().uuid('Please select a table'),
})

type SeatGuestFormValues = z.infer<typeof seatGuestSchema>

interface Table {
  id: string
  table_number: string
  capacity: number
  status: string
  section?: string
}

interface WaitlistSeatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (tableId: string) => Promise<void>
  tables: Table[]
  partySize: number
  guestName: string
}

export function WaitlistSeatDialog({
  open,
  onOpenChange,
  onSubmit,
  tables,
  partySize,
  guestName,
}: WaitlistSeatDialogProps) {
  const t = useTranslations('reservations')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<SeatGuestFormValues>({
    resolver: zodResolver(seatGuestSchema),
    defaultValues: {
      table_id: '',
    },
  })

  // Filter available tables that can accommodate the party
  const availableTables = tables.filter(
    (table) =>
      table.status === 'available' && table.capacity >= partySize
  )

  const handleSubmit = async (data: SeatGuestFormValues) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data.table_id)
      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to seat guest:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{t('waitlist.seat')}</DialogTitle>
          <DialogDescription>
            Assign <span className="font-semibold">{guestName}</span> to an available table (Party of {partySize})
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="table_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Table</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an available table" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableTables.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No available tables for party of {partySize}
                        </div>
                      ) : (
                        availableTables.map((table) => (
                          <SelectItem key={table.id} value={table.id}>
                            <div className="flex items-center justify-between w-full">
                              <span className="font-medium">
                                Table {table.table_number}
                              </span>
                              <div className="flex items-center gap-2 ml-4">
                                <Badge variant="outline" className="text-xs">
                                  <Users className="h-3 w-3 mr-1" />
                                  {table.capacity}
                                </Badge>
                                {table.section && (
                                  <Badge variant="secondary" className="text-xs">
                                    {table.section}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {availableTables.length === 0 && (
              <div className="rounded-md bg-primary/10 p-3 text-sm text-primary">
                No tables are currently available that can accommodate {partySize} guests.
                Please free up a table or ask the guest to wait longer.
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('overview.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || availableTables.length === 0}
              >
                {isSubmitting ? 'Seating...' : t('waitlist.seat')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
