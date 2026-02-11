'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NewsletterList } from '@/components/marketing/newsletter-list'
import { NewsletterEditor } from '@/components/marketing/newsletter-editor'
import { SubscriberManagement } from '@/components/marketing/subscriber-management'
import { useToast } from '@/hooks/use-toast'
import { Mail, Users, Send, FileText, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function NewsletterPage() {
  const t = useTranslations('marketing')
  const [activeTab, setActiveTab] = useState('newsletters')
  const [showEditor, setShowEditor] = useState(false)
  const [editingNewsletter, setEditingNewsletter] = useState<any>(null)
  const [newsletters, setNewsletters] = useState<any[]>([])
  const [subscribers, setSubscribers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Fetch newsletters
  const fetchNewsletters = async () => {
    try {
      const response = await fetch('/api/marketing/newsletters')
      if (!response.ok) throw new Error('Failed to fetch newsletters')
      const data = await response.json()
      setNewsletters(data)
    } catch (error) {
      console.error('Error fetching newsletters:', error)
      toast({
        title: 'Error',
        description: 'Failed to load newsletters',
        variant: 'destructive',
      })
    }
  }

  // Fetch subscribers
  const fetchSubscribers = async () => {
    try {
      const response = await fetch('/api/marketing/subscribers')
      if (!response.ok) throw new Error('Failed to fetch subscribers')
      const data = await response.json()
      setSubscribers(data)
    } catch (error) {
      console.error('Error fetching subscribers:', error)
      toast({
        title: 'Error',
        description: 'Failed to load subscribers',
        variant: 'destructive',
      })
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchNewsletters(), fetchSubscribers()])
      setLoading(false)
    }
    loadData()
  }, [])

  // Calculate stats
  const stats = {
    totalNewsletters: newsletters.length,
    drafts: newsletters.filter((n) => n.status === 'draft').length,
    scheduled: newsletters.filter((n) => n.status === 'scheduled').length,
    sent: newsletters.filter((n) => n.status === 'sent').length,
    totalSubscribers: subscribers.length,
    activeSubscribers: subscribers.filter((s) => s.is_active).length,
    byLanguage: {
      nl: subscribers.filter((s) => s.language === 'nl' && s.is_active).length,
      en: subscribers.filter((s) => s.language === 'en' && s.is_active).length,
      es: subscribers.filter((s) => s.language === 'es' && s.is_active).length,
    },
  }

  const handleCreateNewsletter = () => {
    setEditingNewsletter(null)
    setShowEditor(true)
  }

  const handleEditNewsletter = (newsletter: any) => {
    setEditingNewsletter(newsletter)
    setShowEditor(true)
  }

  const handleCloseEditor = () => {
    setShowEditor(false)
    setEditingNewsletter(null)
    fetchNewsletters()
  }

  const handleDeleteNewsletter = async (id: string) => {
    if (!confirm('Are you sure you want to delete this newsletter?')) return

    try {
      const response = await fetch(`/api/marketing/newsletters/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete newsletter')

      toast({
        title: 'Success',
        description: 'Newsletter deleted successfully',
      })

      fetchNewsletters()
    } catch (error) {
      console.error('Error deleting newsletter:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete newsletter',
        variant: 'destructive',
      })
    }
  }

  const handleSendNewsletter = async (id: string) => {
    if (!confirm('Send this newsletter now? This action cannot be undone.')) return

    try {
      const response = await fetch(`/api/marketing/newsletters/${id}/send`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to send newsletter')

      toast({
        title: 'Success',
        description: 'Newsletter sent successfully',
      })

      fetchNewsletters()
    } catch (error) {
      console.error('Error sending newsletter:', error)
      toast({
        title: 'Error',
        description: 'Failed to send newsletter',
        variant: 'destructive',
      })
    }
  }

  if (showEditor) {
    return (
      <NewsletterEditor
        newsletter={editingNewsletter}
        onClose={handleCloseEditor}
        onSave={handleCloseEditor}
      />
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Mail className="h-8 w-8 text-indigo-500" />
            {t('newsletter.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('newsletter.subtitle')}
          </p>
        </div>
        <Button onClick={handleCreateNewsletter} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('newsletter.createNewsletter')}
        </Button>
      </div>

      {/* Stats KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Total Newsletters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalNewsletters}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.drafts} {t('newsletter.draft')}, {stats.scheduled} {t('newsletter.schedule')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Send className="h-3 w-3" />
              {t('newsletter.sent')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.sent}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              Active Subscribers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {stats.activeSubscribers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              of {stats.totalSubscribers} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              By Language
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 text-sm">
              <span className="font-semibold">NL:</span> {stats.byLanguage.nl}
              <span className="mx-1">|</span>
              <span className="font-semibold">EN:</span> {stats.byLanguage.en}
              <span className="mx-1">|</span>
              <span className="font-semibold">ES:</span> {stats.byLanguage.es}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="newsletters">{t('newsletter.title')}</TabsTrigger>
          <TabsTrigger value="subscribers">{t('newsletter.recipients')}</TabsTrigger>
        </TabsList>

        <TabsContent value="newsletters" className="mt-6">
          <NewsletterList
            newsletters={newsletters}
            loading={loading}
            onEdit={handleEditNewsletter}
            onDelete={handleDeleteNewsletter}
            onSend={handleSendNewsletter}
          />
        </TabsContent>

        <TabsContent value="subscribers" className="mt-6">
          <SubscriberManagement
            subscribers={subscribers}
            loading={loading}
            onRefresh={fetchSubscribers}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
