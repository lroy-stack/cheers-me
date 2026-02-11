'use client'

export default function BookingSkeleton() {
  return (
    <div className="animate-pulse space-y-8 py-8 px-4 max-w-4xl mx-auto">
      {/* Progress bar skeleton */}
      <div className="flex items-center justify-between max-w-xl mx-auto">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-muted" />
            <div className="w-12 h-3 rounded bg-muted hidden sm:block" />
          </div>
        ))}
      </div>

      {/* Title skeleton */}
      <div className="text-center space-y-3">
        <div className="h-8 w-64 bg-muted rounded mx-auto" />
        <div className="h-4 w-48 bg-muted rounded mx-auto" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-32 rounded-xl bg-muted"
          />
        ))}
      </div>
    </div>
  )
}
