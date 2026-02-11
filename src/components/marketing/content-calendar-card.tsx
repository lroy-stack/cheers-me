'use client'

import { ContentCalendarEntry } from '@/types/marketing'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Instagram,
  Facebook,
  MoreVertical,
  Edit,
  Trash2,
  Calendar,
  Globe,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

interface ContentCalendarCardProps {
  entry: ContentCalendarEntry
  onEdit?: (entry: ContentCalendarEntry) => void
  onDelete?: (entry: ContentCalendarEntry) => void
  onPublish?: (entry: ContentCalendarEntry) => void
  className?: string
  compact?: boolean
}

const statusIcons = {
  draft: { icon: FileText, color: 'bg-muted0', variant: 'secondary' as const },
  scheduled: { icon: Clock, color: 'bg-blue-500', variant: 'default' as const },
  published: { icon: CheckCircle2, color: 'bg-green-500', variant: 'default' as const },
  failed: { icon: AlertCircle, color: 'bg-red-500', variant: 'destructive' as const },
}

const platformIcons = {
  instagram: { icon: Instagram, color: 'text-pink-500' },
  facebook: { icon: Facebook, color: 'text-blue-600' },
  multi: { icon: Globe, color: 'text-indigo-500' },
}

const languageConfig = {
  nl: { label: 'NL', flag: '🇳🇱' },
  en: { label: 'EN', flag: '🇬🇧' },
  es: { label: 'ES', flag: '🇪🇸' },
}

export function ContentCalendarCard({
  entry,
  onEdit,
  onDelete,
  onPublish,
  className,
  compact = false,
}: ContentCalendarCardProps) {
  const t = useTranslations('marketing')
  const statusLabels: Record<string, string> = {
    draft: t('contentCalendar.draft'),
    scheduled: t('contentCalendar.scheduled'),
    published: t('contentCalendar.published'),
    failed: t('contentCalendar.failed'),
  }
  const status = statusIcons[entry.status]
  const platform = entry.platform ? platformIcons[entry.platform] : null
  const language = entry.language ? languageConfig[entry.language] : null
  const StatusIcon = status.icon
  const PlatformIcon = platform?.icon

  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardHeader className={cn('pb-3', compact && 'p-3')}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {platform && PlatformIcon && (
                <PlatformIcon className={cn('h-4 w-4 flex-shrink-0', platform.color)} />
              )}
              <h3
                className={cn(
                  'font-semibold truncate',
                  compact ? 'text-sm' : 'text-base'
                )}
              >
                {entry.title}
              </h3>
            </div>
            {entry.scheduled_date && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {format(new Date(entry.scheduled_date), 'MMM d, yyyy • HH:mm')}
                </span>
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(entry)}>
                  <Edit className="mr-2 h-4 w-4" />
                  {t('common.edit')}
                </DropdownMenuItem>
              )}
              {onPublish && entry.status === 'draft' && (
                <DropdownMenuItem onClick={() => onPublish(entry)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t('createPost.publishNow')}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(entry)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('common.delete')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {!compact && entry.description && (
        <CardContent className="pb-3">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {entry.description}
          </p>
        </CardContent>
      )}

      {entry.image_url && !compact && (
        <CardContent className="pb-3">
          <div className="relative aspect-video rounded-md overflow-hidden bg-muted">
            <img
              src={entry.image_url}
              alt={entry.title}
              className="object-cover w-full h-full"
            />
          </div>
        </CardContent>
      )}

      <CardFooter className={cn('pt-3 border-t', compact && 'p-3')}>
        <div className="flex items-center justify-between w-full gap-2">
          <div className="flex items-center gap-2">
            <Badge variant={status.variant} className="text-xs">
              <StatusIcon className="mr-1 h-3 w-3" />
              {statusLabels[entry.status]}
            </Badge>
            {language && (
              <Badge variant="outline" className="text-xs">
                <span className="mr-1">{language.flag}</span>
                {language.label}
              </Badge>
            )}
          </div>

          {entry.created_by_employee?.profile && (
            <span className="text-xs text-muted-foreground truncate">
              {t('newsletter.createdBy', { name: entry.created_by_employee.profile.full_name })}
            </span>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
