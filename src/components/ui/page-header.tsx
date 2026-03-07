'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  backHref?: string
  backLabel?: string
  className?: string
  children?: React.ReactNode
}

/**
 * PageHeader — reusable page header with optional back button.
 * Usage:
 *   <PageHeader title="Employee Detail" backHref="/staff" backLabel="Back to Employees" />
 *   <PageHeader title="Reservation" /> — uses router.back() if no backHref
 */
export function PageHeader({
  title,
  description,
  backHref,
  backLabel,
  className,
  children,
}: PageHeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    if (backHref) {
      router.push(backHref)
    } else {
      router.back()
    }
  }

  return (
    <div className={cn('flex flex-col gap-1 mb-6', className)}>
      {(backHref !== undefined || backLabel !== undefined) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="w-fit -ml-2 gap-1.5 text-muted-foreground hover:text-foreground min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel || 'Back'}
        </Button>
      )}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
      </div>
    </div>
  )
}
