'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Shield } from 'lucide-react'
import Image from 'next/image'

interface KioskDeviceLoginProps {
  onSuccess: () => void
}

export function KioskDeviceLogin({ onSuccess }: KioskDeviceLoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/public/kiosk/device-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Login failed')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <Image
              src="/cheers_logo.png"
              alt="GrandCafe Cheers"
              width={80}
              height={80}
              className="rounded-xl"
            />
          </div>
          <CardTitle className="text-xl">Kiosk Setup</CardTitle>
          <p className="text-sm text-muted-foreground">
            Authenticate this device to enable employee clock-in
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kiosk-email">Kiosk Account</Label>
              <Input
                id="kiosk-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kiosk@cheersmallorca.com"
                required
                disabled={loading}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kiosk-password">Password</Label>
              <Input
                id="kiosk-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button type="submit" className="w-full h-12" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Shield className="mr-2 h-4 w-4" />
              )}
              Activate Kiosk
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              This session lasts 24 hours. Only managers can activate kiosk devices.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
