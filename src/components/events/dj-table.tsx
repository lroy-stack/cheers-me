'use client'

import { useState } from 'react'
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Music2,
  Mail,
  Phone,
  Instagram,
  Facebook,
  Search,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { DJWithStats } from './dj-types'

interface DJTableProps {
  djs: DJWithStats[]
  onEdit: (dj: DJWithStats) => void
  onDelete: (id: string) => void
  onView: (dj: DJWithStats) => void
  isLoading?: boolean
}

export function DJTable({ djs, onEdit, onDelete, onView, isLoading }: DJTableProps) {
  const t = useTranslations('events')
  const [searchTerm, setSearchTerm] = useState('')
  const [genreFilter, setGenreFilter] = useState('')

  // Filter DJs based on search and genre
  const filteredDJs = djs.filter((dj) => {
    const matchesSearch =
      searchTerm === '' ||
      dj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dj.genre && dj.genre.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesGenre =
      genreFilter === '' ||
      (dj.genre && dj.genre.toLowerCase().includes(genreFilter.toLowerCase()))

    return matchesSearch && matchesGenre
  })

  // Get unique genres for filter
  const genres = Array.from(new Set(djs.map((dj) => dj.genre).filter(Boolean)))

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted animate-pulse rounded" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('djs.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={genreFilter}
          onChange={(e) => setGenreFilter(e.target.value)}
          className="px-3 py-2 rounded-md border border-input bg-background"
        >
          <option value="">{t('djs.allGenres')}</option>
          {genres.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {t('djs.showingCount', { count: filteredDJs.length, total: djs.length })}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredDJs.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              {searchTerm || genreFilter ? t('djs.noMatchSearch') : t('djs.noDjs')}
            </CardContent>
          </Card>
        ) : (
          filteredDJs.map((dj) => (
            <Card
              key={dj.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onView(dj)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-500/10 text-pink-500">
                      <Music2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{dj.name}</div>
                      {dj.genre && (
                        <Badge variant="secondary" className="mt-1 text-xs">{dj.genre}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-medium text-sm">&euro;{dj.fee.toFixed(0)}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">{t('djs.openMenu')}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t('djs.actions')}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onView(dj)}>
                          <Eye className="mr-2 h-4 w-4" />
                          {t('djs.viewDetails')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(dj)}>
                          <Edit className="mr-2 h-4 w-4" />
                          {t('djs.editDj')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(dj.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('djs.deleteDj')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {/* Contact info row */}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  {dj.email && (
                    <div className="flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{dj.email}</span>
                    </div>
                  )}
                  {dj.social_links?.instagram && <Instagram className="h-3 w-3 shrink-0" />}
                  {dj.social_links?.facebook && <Facebook className="h-3 w-3 shrink-0" />}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('djs.name')}</TableHead>
              <TableHead>{t('djs.genre')}</TableHead>
              <TableHead className="hidden lg:table-cell">{t('djs.contact')}</TableHead>
              <TableHead className="text-right">{t('djs.rate')}</TableHead>
              <TableHead className="hidden xl:table-cell text-center">{t('djs.events')}</TableHead>
              <TableHead className="w-auto min-w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDJs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {searchTerm || genreFilter ? t('djs.noMatchSearch') : t('djs.noDjs')}
                </TableCell>
              </TableRow>
            ) : (
              filteredDJs.map((dj) => (
                <TableRow
                  key={dj.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onView(dj)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-500/10 text-pink-500">
                        <Music2 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium">{dj.name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {dj.genre ? (
                      <Badge variant="secondary">{dj.genre}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">{t('djs.noGenre')}</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex flex-col gap-1">
                      {dj.email && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="truncate max-w-[120px] md:max-w-[180px]">{dj.email}</span>
                        </div>
                      )}
                      {dj.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{dj.phone}</span>
                        </div>
                      )}
                      {dj.social_links && (
                        <div className="flex items-center gap-1">
                          {dj.social_links.instagram && (
                            <Instagram className="h-3 w-3 text-muted-foreground" />
                          )}
                          {dj.social_links.facebook && (
                            <Facebook className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    &euro;{dj.fee.toFixed(0)}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell text-center">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm">
                        {t('djs.totalCount', { count: dj.total_events || 0 })}
                      </span>
                      {dj.upcoming_events !== undefined && dj.upcoming_events > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {t('djs.upcomingEventsCount', { count: dj.upcoming_events })}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">{t('djs.openMenu')}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t('djs.actions')}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onView(dj)}>
                          <Eye className="mr-2 h-4 w-4" />
                          {t('djs.viewDetails')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(dj)}>
                          <Edit className="mr-2 h-4 w-4" />
                          {t('djs.editDj')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(dj.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('djs.deleteDj')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
