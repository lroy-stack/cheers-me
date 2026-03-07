'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { UserCog, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type RequestType = 'access' | 'erasure' | 'portability' | 'correction'
type Status = 'idle' | 'loading' | 'success' | 'error'

export default function DataRequestPage() {
  const t = useTranslations('legal.dataRequest')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [requestType, setRequestType] = useState<RequestType | ''>('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const requestTypes: { value: RequestType; label: string }[] = [
    { value: 'access', label: t('requestTypes.access') },
    { value: 'erasure', label: t('requestTypes.erasure') },
    { value: 'portability', label: t('requestTypes.portability') },
    { value: 'correction', label: t('requestTypes.rectification') },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !requestType) return

    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/public/data-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: requestType,
          email,
          full_name: fullName || undefined,
          message: message || undefined,
        }),
      })

      if (res.ok) {
        setStatus('success')
      } else {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data.error ?? 'Submission failed. Please try again.')
        setStatus('error')
      }
    } catch {
      setErrorMsg('Network error. Please try again.')
      setStatus('error')
    }
  }

  return (
    <article>
      <div className="flex items-center gap-3 mb-6">
        <UserCog className="w-7 h-7 text-primary shrink-0" />
        <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
      </div>

      <p className="text-muted-foreground leading-relaxed mb-8">{t('intro')}</p>

      {status === 'success' ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">{t('successTitle')}</h2>
          <p className="text-muted-foreground">{t('successText')}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
          {/* Full name */}
          <div className="space-y-1.5">
            <Label htmlFor="dsar-name">{t('nameLabel')}</Label>
            <Input
              id="dsar-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Smith"
              autoComplete="name"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="dsar-email">
              {t('emailLabel')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dsar-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
            />
          </div>

          {/* Request type */}
          <div className="space-y-1.5">
            <Label htmlFor="dsar-type">
              {t('requestTypeLabel')} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={requestType}
              onValueChange={(v) => setRequestType(v as RequestType)}
              required
            >
              <SelectTrigger id="dsar-type">
                <SelectValue placeholder="Select request type…" />
              </SelectTrigger>
              <SelectContent>
                {requestTypes.map((rt) => (
                  <SelectItem key={rt.value} value={rt.value}>
                    {rt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <Label htmlFor="dsar-message">{t('detailsLabel')}</Label>
            <Textarea
              id="dsar-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Any additional context…"
              rows={4}
              maxLength={2000}
            />
          </div>

          {/* Privacy note */}
          <p className="text-xs text-muted-foreground">{t('privacyNote')}</p>

          {status === 'error' && (
            <p className="text-sm text-destructive">{errorMsg}</p>
          )}

          <Button
            type="submit"
            disabled={status === 'loading' || !email || !requestType}
            className="w-full sm:w-auto"
          >
            {status === 'loading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('submitButton')}
          </Button>
        </form>
      )}
    </article>
  )
}
