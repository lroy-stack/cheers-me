'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { TrendingUp, AlertCircle, CheckCircle, Eye } from 'lucide-react'
import { format } from 'date-fns'

interface SurveyResponse {
  id: string
  employee_id: string
  rating: number
  feedback: string | null
  anomaly_type: string | null
  anomaly_reason: string | null
  anomaly_comment: string | null
  ai_analysis: {
    sentiment: string
    themes: string[]
    manager_alert: boolean
    suggestions: string[]
    summary: string
  } | null
  manager_reviewed: boolean
  manager_notes: string | null
  responded_at: string
  employee: {
    id: string
    profile: {
      id: string
      full_name: string | null
      role: string
    }
  }
}

interface SurveyStats {
  total: number
  avgRating: number
  flagged: number
  unreviewed: number
}

const EMOJI_RATINGS = ['😡', '😕', '😐', '🙂', '😄']

export function ShiftSurveyDashboard() {
  const t = useTranslations('staff.feedback')
  const [surveys, setSurveys] = useState<SurveyResponse[]>([])
  const [stats, setStats] = useState<SurveyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyResponse | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    rating_max: 'all',
    employee_id: '',
    unreviewed: false,
  })

  const fetchSurveys = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.from) params.append('from', filters.from)
      if (filters.to) params.append('to', filters.to)
      if (filters.rating_max && filters.rating_max !== 'all') params.append('rating_max', filters.rating_max)
      if (filters.employee_id) params.append('employee_id', filters.employee_id)
      if (filters.unreviewed) params.append('unreviewed', 'true')

      const response = await fetch(`/api/staff/surveys?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setSurveys(data.surveys || [])
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error('Failed to fetch surveys:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchSurveys()
  }, [])

  const handleMarkReviewed = async () => {
    if (!selectedSurvey) return

    try {
      const response = await fetch(`/api/staff/surveys/${selectedSurvey.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manager_reviewed: true,
          manager_notes: reviewNotes || undefined,
        }),
      })

      if (response.ok) {
        setSelectedSurvey(null)
        setReviewNotes('')
        fetchSurveys()
      }
    } catch (error) {
      console.error('Failed to mark as reviewed:', error)
    }
  }

  const getRatingBadge = (rating: number) => {
    if (rating <= 2) return <Badge variant="destructive">{EMOJI_RATINGS[rating - 1]} {rating}/5</Badge>
    if (rating === 3) return <Badge variant="secondary">{EMOJI_RATINGS[rating - 1]} {rating}/5</Badge>
    return <Badge variant="default">{EMOJI_RATINGS[rating - 1]} {rating}/5</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.total')}</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.avgRating')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgRating.toFixed(1)}/5</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.flagged')}</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.flagged}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.unreviewed')}</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unreviewed}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('filters')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="from">{t('from')}</Label>
              <Input
                id="from"
                type="date"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="to">{t('to')}</Label>
              <Input
                id="to"
                type="date"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="maxRating">{t('maxRating')}</Label>
              <Select
                value={filters.rating_max}
                onValueChange={(value) => setFilters({ ...filters, rating_max: value })}
              >
                <SelectTrigger id="maxRating">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allRatings')}</SelectItem>
                  <SelectItem value="2">≤ 2 (Flagged)</SelectItem>
                  <SelectItem value="3">≤ 3</SelectItem>
                  <SelectItem value="4">≤ 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="unreviewed"
                  checked={filters.unreviewed}
                  onCheckedChange={(checked) =>
                    setFilters({ ...filters, unreviewed: checked as boolean })
                  }
                />
                <Label htmlFor="unreviewed" className="text-sm">
                  {t('unreviewed')}
                </Label>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchSurveys}>{t('apply')}</Button>
            <Button
              variant="outline"
              onClick={() => {
                setFilters({ from: '', to: '', rating_max: 'all', employee_id: '', unreviewed: false })
                fetchSurveys()
              }}
            >
              {t('clear')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Survey Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : surveys.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t('noData')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.date')}</TableHead>
                    <TableHead>{t('table.employee')}</TableHead>
                    <TableHead>{t('table.rating')}</TableHead>
                    <TableHead>{t('table.anomaly')}</TableHead>
                    <TableHead>{t('table.reviewed')}</TableHead>
                    <TableHead>{t('table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surveys.map((survey) => (
                    <TableRow key={survey.id}>
                      <TableCell>
                        {format(new Date(survey.responded_at), 'MMM dd, HH:mm')}
                      </TableCell>
                      <TableCell>{survey.employee.profile.full_name || 'Unknown'}</TableCell>
                      <TableCell>{getRatingBadge(survey.rating)}</TableCell>
                      <TableCell>
                        {survey.anomaly_type ? (
                          <Badge variant="outline">{survey.anomaly_type}</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {survey.manager_reviewed ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedSurvey(survey)
                            setReviewNotes(survey.manager_notes || '')
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedSurvey} onOpenChange={() => setSelectedSurvey(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t('table.feedback')} — {selectedSurvey?.employee.profile.full_name}
            </DialogTitle>
          </DialogHeader>
          {selectedSurvey && (
            <div className="space-y-4">
              <div>
                <Label>{t('date')}</Label>
                <p className="text-sm">
                  {format(new Date(selectedSurvey.responded_at), 'PPpp')}
                </p>
              </div>
              <div>
                <Label>{t('table.rating')}</Label>
                <div className="mt-1">{getRatingBadge(selectedSurvey.rating)}</div>
              </div>
              {selectedSurvey.anomaly_type && (
                <div>
                  <Label>{t('table.anomaly')}</Label>
                  <div className="space-y-1 text-sm">
                    <p>{t('type')}: <Badge variant="outline">{selectedSurvey.anomaly_type}</Badge></p>
                    {selectedSurvey.anomaly_reason && (
                      <p>{t('reason')}: {selectedSurvey.anomaly_reason}</p>
                    )}
                    {selectedSurvey.anomaly_comment && (
                      <p className="text-muted-foreground">{selectedSurvey.anomaly_comment}</p>
                    )}
                  </div>
                </div>
              )}
              {selectedSurvey.feedback && (
                <div>
                  <Label>{t('table.feedback')}</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{selectedSurvey.feedback}</p>
                </div>
              )}
              {selectedSurvey.ai_analysis && (
                <div className="border-t pt-4">
                  <Label className="text-base">{t('table.aiAnalysis')}</Label>
                  <div className="space-y-2 mt-2 text-sm">
                    <div>
                      <span className="font-medium">{t('aiSentiment')}:</span>{' '}
                      <Badge>{selectedSurvey.ai_analysis.sentiment}</Badge>
                    </div>
                    {selectedSurvey.ai_analysis.themes.length > 0 && (
                      <div>
                        <span className="font-medium">{t('aiThemes')}:</span>{' '}
                        {selectedSurvey.ai_analysis.themes.join(', ')}
                      </div>
                    )}
                    {selectedSurvey.ai_analysis.manager_alert && (
                      <div className="text-destructive font-medium">
                        ⚠️ {t('managerAlert')}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">{t('aiSummary')}:</span>{' '}
                      {selectedSurvey.ai_analysis.summary}
                    </div>
                    {selectedSurvey.ai_analysis.suggestions.length > 0 && (
                      <div>
                        <span className="font-medium">{t('aiSuggestions')}:</span>
                        <ul className="list-disc list-inside mt-1">
                          {selectedSurvey.ai_analysis.suggestions.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {selectedSurvey.manager_notes && (
                <div>
                  <Label>{t('reviewNotes')}</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">
                    {selectedSurvey.manager_notes}
                  </p>
                </div>
              )}
              {!selectedSurvey.manager_reviewed && (
                <div>
                  <Label htmlFor="notes">{t('addNotes')}</Label>
                  <Textarea
                    id="notes"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder={t('addNotes')}
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSurvey(null)}>
              {t('cancel')}
            </Button>
            {selectedSurvey && !selectedSurvey.manager_reviewed && (
              <Button onClick={handleMarkReviewed}>{t('markReviewed')}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
