'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { Loader2, Plus, Edit, Trash2, GraduationCap } from 'lucide-react'
interface TrainingMaterial {
  id: string
  guide_code: string
  title: string
  description: string | null
  passing_score: number
  category: string | null
  created_at: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function TrainingAdminPage() {
  const { toast } = useToast()
  const { data: materials = [], isLoading, mutate } = useSWR<TrainingMaterial[]>(
    '/api/staff/training/materials',
    fetcher
  )

  const [showCreate, setShowCreate] = useState(false)
  const [editMaterial, setEditMaterial] = useState<TrainingMaterial | null>(null)
  const [form, setForm] = useState({ guide_code: '', title: '', description: '', passing_score: 70, video_url: '' })
  const [saving, setSaving] = useState(false)

  const resetForm = () => setForm({ guide_code: '', title: '', description: '', passing_score: 70, video_url: '' })

  const handleCreate = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/staff/training/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Training material created' })
      mutate()
      setShowCreate(false)
      resetForm()
    } catch {
      toast({ title: 'Failed to create material', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!editMaterial) return
    setSaving(true)
    try {
      const res = await fetch(`/api/staff/training/materials`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editMaterial.id, ...form }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Training material updated' })
      mutate()
      setEditMaterial(null)
      resetForm()
    } catch {
      toast({ title: 'Failed to update material', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this training material?')) return
    try {
      const res = await fetch(`/api/staff/training/materials?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Training material deleted' })
      mutate()
    } catch {
      toast({ title: 'Failed to delete material', variant: 'destructive' })
    }
  }

  const openEdit = (m: TrainingMaterial) => {
    setForm({
      guide_code: m.guide_code,
      title: m.title,
      description: m.description || '',
      passing_score: m.passing_score,
      video_url: (m as { video_url?: string }).video_url || '',
    })
    setEditMaterial(m)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Training Admin</h1>
            <p className="text-muted-foreground text-sm">Manage training materials and courses</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowCreate(true) }} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Material
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : materials.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No training materials yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {materials.map((m) => (
            <Card key={m.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{m.title}</CardTitle>
                    <CardDescription>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">{m.guide_code}</code>
                      {m.category && (
                        <Badge variant="secondary" className="ml-2 text-xs">{m.category}</Badge>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(m.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {m.description && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">{m.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">Passing score: {m.passing_score}%</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Training Material</DialogTitle>
            <DialogDescription>Create a new training guide or course</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Guide Code</Label>
              <Input
                placeholder="e.g. food_safety_01"
                value={form.guide_code}
                onChange={(e) => setForm((p) => ({ ...p, guide_code: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="e.g. Food Safety Basics"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of this training..."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Passing Score (%)</Label>
              <Input
                type="number"
                min={50}
                max={100}
                value={form.passing_score}
                onChange={(e) => setForm((p) => ({ ...p, passing_score: parseInt(e.target.value) || 70 }))}
                className="max-w-xs"
              />
            </div>
            <div className="space-y-2">
              <Label>Video URL (optional)</Label>
              <Input
                placeholder="https://www.youtube.com/embed/..."
                value={form.video_url}
                onChange={(e) => setForm((p) => ({ ...p, video_url: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !form.guide_code || !form.title}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editMaterial} onOpenChange={(open) => !open && setEditMaterial(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Training Material</DialogTitle>
            <DialogDescription>Update training guide details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Passing Score (%)</Label>
              <Input
                type="number"
                min={50}
                max={100}
                value={form.passing_score}
                onChange={(e) => setForm((p) => ({ ...p, passing_score: parseInt(e.target.value) || 70 }))}
                className="max-w-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMaterial(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving || !form.title}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  )
}
