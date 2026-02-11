'use client'

import { useState } from 'react'
import { ClockInOutCard } from '@/components/staff/clock-in-out-card'
import { ClockHistory } from '@/components/staff/clock-history'

interface ClockPageClientProps {
  employeeId: string
}

export function ClockPageClient({ employeeId }: ClockPageClientProps) {
  const [historyKey, setHistoryKey] = useState(0)

  const handleClockChange = () => {
    // Refresh the history by changing the key
    setHistoryKey((prev) => prev + 1)
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Clock In/Out Card */}
      <div className="md:col-span-1">
        <ClockInOutCard employeeId={employeeId} onClockChange={handleClockChange} />
      </div>

      {/* Clock History - Key forces re-render */}
      <div className="md:col-span-1 lg:col-span-2">
        <ClockHistory key={historyKey} employeeId={employeeId} limit={10} />
      </div>
    </div>
  )
}
