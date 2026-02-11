import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function Loading() {
  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div>
          <Skeleton className="h-9 w-56 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}><CardHeader className="pb-3"><Skeleton className="h-4 w-32" /><Skeleton className="h-8 w-24" /></CardHeader><CardContent><Skeleton className="h-3 w-40" /></CardContent></Card>
          ))}
        </div>
        <Card><CardHeader><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-64" /></CardHeader><CardContent><Skeleton className="h-48" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-6 w-32" /></CardHeader><CardContent><Skeleton className="h-64" /></CardContent></Card>
      </div>
    </div>
  )
}
