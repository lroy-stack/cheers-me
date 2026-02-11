import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdForm from '@/components/ads/ad-form'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export async function generateMetadata() {
  const t = await getTranslations('ads')
  return { title: t('editAd') }
}

export default async function EditAdPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations('ads')
  const { id } = await params

  const supabase = await createClient()
  const { data: ad } = await supabase
    .from('advertisements')
    .select('*')
    .eq('id', id)
    .single()

  if (!ad) redirect('/ads')

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/ads" className="p-1.5 rounded-md hover:bg-muted transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t('editAd')}</h1>
        </div>
      </div>
      <AdForm ad={ad} />
    </div>
  )
}
