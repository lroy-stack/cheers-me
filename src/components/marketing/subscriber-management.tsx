'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Users, Search, MoreVertical, UserX, Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'

interface Subscriber {
  id: string
  email: string
  name?: string
  language: 'nl' | 'en' | 'es'
  is_active: boolean
  subscribed_at: string
  unsubscribed_at?: string
}

interface SubscriberManagementProps {
  subscribers: Subscriber[]
  loading: boolean
  onRefresh: () => void
}

const getLanguageFlag = (language: string) => {
  switch (language) {
    case 'nl':
      return '🇳🇱'
    case 'en':
      return '🇬🇧'
    case 'es':
      return '🇪🇸'
    default:
      return '🌐'
  }
}

export function SubscriberManagement({
  subscribers,
  loading,
  onRefresh,
}: SubscriberManagementProps) {
  const t = useTranslations('marketing.subscribers')
  const [searchQuery, setSearchQuery] = useState('')
  const [languageFilter, setLanguageFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const { toast } = useToast()

  const getLanguageLabel = (language: string) => {
    switch (language) {
      case 'nl':
        return t('dutch')
      case 'en':
        return t('english')
      case 'es':
        return t('spanish')
      default:
        return language
    }
  }

  // Apply filters
  const filteredSubscribers = subscribers.filter((subscriber) => {
    const matchesSearch =
      searchQuery === '' ||
      subscriber.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subscriber.name?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesLanguage = languageFilter === 'all' || subscriber.language === languageFilter

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && subscriber.is_active) ||
      (statusFilter === 'inactive' && !subscriber.is_active)

    return matchesSearch && matchesLanguage && matchesStatus
  })

  const handleUnsubscribe = async (subscriber: Subscriber) => {
    if (!confirm(t('confirmUnsubscribe', { email: subscriber.email }))) return

    try {
      const response = await fetch(`/api/marketing/subscribers/${subscriber.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      })

      if (!response.ok) throw new Error('Failed to unsubscribe')

      toast({
        title: t('success'),
        description: t('unsubscribedSuccess'),
      })

      onRefresh()
    } catch (error) {
      console.error('Error unsubscribing:', error)
      toast({
        title: t('error'),
        description: t('unsubscribeFailed'),
        variant: 'destructive',
      })
    }
  }

  const handleReactivate = async (subscriber: Subscriber) => {
    try {
      const response = await fetch(`/api/marketing/subscribers/${subscriber.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true }),
      })

      if (!response.ok) throw new Error('Failed to reactivate')

      toast({
        title: t('success'),
        description: t('reactivatedSuccess'),
      })

      onRefresh()
    } catch (error) {
      console.error('Error reactivating:', error)
      toast({
        title: t('error'),
        description: t('reactivateFailed'),
        variant: 'destructive',
      })
    }
  }

  const handleExport = () => {
    const csv = [
      [t('email'), t('name'), t('language'), t('status'), t('subscribed')],
      ...filteredSubscribers.map((s) => [
        s.email,
        s.name || '',
        getLanguageLabel(s.language),
        s.is_active ? t('active') : t('inactive'),
        format(new Date(s.subscribed_at), 'yyyy-MM-dd HH:mm'),
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `subscribers-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: t('success'),
      description: t('exportedSuccess'),
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/4" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('title')} ({filteredSubscribers.length})
            </CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            {t('exportCsv')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={languageFilter} onValueChange={setLanguageFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder={t('language')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allLanguages')}</SelectItem>
              <SelectItem value="nl">🇳🇱 {t('dutch')}</SelectItem>
              <SelectItem value="en">🇬🇧 {t('english')}</SelectItem>
              <SelectItem value="es">🇪🇸 {t('spanish')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder={t('status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allStatus')}</SelectItem>
              <SelectItem value="active">{t('active')}</SelectItem>
              <SelectItem value="inactive">{t('inactive')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Subscribers Table */}
        {filteredSubscribers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">{t('noSubscribers')}</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery || languageFilter !== 'all' || statusFilter !== 'all'
                ? t('adjustFilters')
                : t('subscribersWillAppear')}
            </p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('email')}</TableHead>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('language')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('subscribed')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscribers.map((subscriber) => (
                  <TableRow key={subscriber.id}>
                    <TableCell className="font-medium">{subscriber.email}</TableCell>
                    <TableCell>{subscriber.name || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{getLanguageFlag(subscriber.language)}</span>
                        <span className="text-sm">{getLanguageLabel(subscriber.language)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {subscriber.is_active ? (
                        <Badge className="bg-green-500">{t('active')}</Badge>
                      ) : (
                        <Badge variant="secondary">{t('inactive')}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(subscriber.subscribed_at), 'PP')}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {subscriber.is_active ? (
                            <DropdownMenuItem
                              onClick={() => handleUnsubscribe(subscriber)}
                              className="text-red-600"
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              {t('unsubscribe')}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleReactivate(subscriber)}
                              className="text-green-600"
                            >
                              <Users className="mr-2 h-4 w-4" />
                              {t('reactivate')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
