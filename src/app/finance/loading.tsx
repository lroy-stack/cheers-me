import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function Loading() {
  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Skeleton className="h-9 w-52 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20" /></CardContent></Card>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Card><CardHeader><Skeleton className="h-6 w-36" /></CardHeader><CardContent><Skeleton className="h-48" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-6 w-36" /></CardHeader><CardContent><Skeleton className="h-48" /></CardContent></Card>
        </div>
        <Card><CardHeader><Skeleton className="h-6 w-40" /></CardHeader><CardContent><Skeleton className="h-64" /></CardContent></Card>
        <div className="grid md:grid-cols-2 gap-6">
          <Card><CardHeader><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-40" /></CardHeader><CardContent><Skeleton className="h-32" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-40" /></CardHeader><CardContent><Skeleton className="h-32" /></CardContent></Card>
        </div>
      </div>
    </div>
  )
}
