'use client'

import { format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Mail,
  MoreVertical,
  Edit,
  Trash2,
  Send,
  Calendar,
  Users,
  Globe
} from 'lucide-react'
import { useTranslations } from 'next-intl'

interface Newsletter {
  id: string
  subject: string
  content: string
  html_content?: string
  segment: 'all' | 'vip' | 'language_nl' | 'language_en' | 'language_es'
  status: 'draft' | 'scheduled' | 'sent' | 'failed'
  scheduled_date?: string
  sent_at?: string
  recipient_count?: number
  created_at: string
  created_by_employee?: {
    profile: {
      full_name: string
    }
  }
}

interface NewsletterListProps {
  newsletters: Newsletter[]
  loading: boolean
  onEdit: (newsletter: Newsletter) => void
  onDelete: (id: string) => void
  onSend: (id: string) => void
}

const getStatusColor = (status: Newsletter['status']) => {
  switch (status) {
    case 'draft':
      return 'bg-muted0'
    case 'scheduled':
      return 'bg-blue-500'
    case 'sent':
      return 'bg-green-500'
    case 'failed':
      return 'bg-red-500'
    default:
      return 'bg-muted0'
  }
}

export function NewsletterList({
  newsletters,
  loading,
  onEdit,
  onDelete,
  onSend,
}: NewsletterListProps) {
  const t = useTranslations('marketing')

  const getSegmentLabel = (segment: Newsletter['segment']) => {
    switch (segment) {
      case 'all':
        return t('newsletter.allSubscribers')
      case 'vip':
        return t('newsletter.vipOnly')
      case 'language_nl':
        return t('newsletter.dutch')
      case 'language_en':
        return t('newsletter.english')
      case 'language_es':
        return t('newsletter.spanish')
      default:
        return segment
    }
  }
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (newsletters.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Mail className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">{t('newsletter.noNewsletters')}</p>
          <p className="text-sm text-muted-foreground">
            {t('newsletter.createFirstNewsletter')}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {newsletters.map((newsletter) => (
        <Card key={newsletter.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-xl">{newsletter.subject}</CardTitle>
                  <Badge className={getStatusColor(newsletter.status)}>
                    {newsletter.status}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-4 flex-wrap mt-2">
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {getSegmentLabel(newsletter.segment)}
                  </span>
                  {newsletter.scheduled_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {t('newsletter.scheduledAt', { date: format(new Date(newsletter.scheduled_date), 'PPp') })}
                    </span>
                  )}
                  {newsletter.sent_at && (
                    <span className="flex items-center gap-1">
                      <Send className="h-3 w-3" />
                      {t('newsletter.sentAt', { date: format(new Date(newsletter.sent_at), 'PPp') })}
                    </span>
                  )}
                  {newsletter.recipient_count !== undefined && newsletter.recipient_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {t('newsletter.recipientCount', { count: newsletter.recipient_count })}
                    </span>
                  )}
                </CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(newsletter)}>
                    <Edit className="mr-2 h-4 w-4" />
                    {t('newsletter.edit')}
                  </DropdownMenuItem>
                  {(newsletter.status === 'draft' || newsletter.status === 'scheduled') && (
                    <DropdownMenuItem
                      onClick={() => onSend(newsletter.id)}
                      className="text-green-600"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {t('newsletter.send')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => onDelete(newsletter.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('newsletter.delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {newsletter.content.substring(0, 200)}
              {newsletter.content.length > 200 && '...'}
            </p>
            <div className="mt-4 text-xs text-muted-foreground">
              {t('newsletter.createdAt', { date: format(new Date(newsletter.created_at), 'PPp') })}
              {newsletter.created_by_employee?.profile?.full_name && (
                <> {t('newsletter.createdBy', { name: newsletter.created_by_employee.profile.full_name })}</>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
