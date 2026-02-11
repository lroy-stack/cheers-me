import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getCurrentUser } from '@/lib/utils/auth'
import { AvatarUpload } from '@/components/auth/avatar-upload'
import { ProfileForm } from '@/components/auth/profile-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ThemeSelector } from '@/components/auth/theme-selector'

export const metadata = {
  title: 'Settings | GrandCafe Cheers',
  description: 'Manage your profile and preferences',
}

export default async function SettingsPage() {
  const userData = await getCurrentUser()

  if (!userData) {
    redirect('/login')
  }

  const { profile } = userData
  const t = await getTranslations('settings')

  // Role badge colors
  const roleColors: Record<string, string> = {
    admin: 'bg-red-500',
    manager: 'bg-blue-500',
    kitchen: 'bg-orange-500',
    bar: 'bg-green-500',
    waiter: 'bg-cyan-500',
    dj: 'bg-pink-500',
    owner: 'bg-purple-500',
  }

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {t('page.title')}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t('page.subtitle')}
              </p>
            </div>
            <Badge
              className={`${roleColors[profile.role]} text-white w-fit`}
              variant="secondary"
            >
              {profile.role.toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Avatar & Quick Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('profilePicture.title')}</CardTitle>
                <CardDescription>
                  {t('profilePicture.subtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-6">
                <AvatarUpload
                  avatarUrl={profile.avatar_url}
                  fullName={profile.full_name}
                />
              </CardContent>
            </Card>


            {/* Account Info */}
            <Card>
              <CardHeader>
                <CardTitle>{t('account.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">{t('account.email')}</p>
                  <p className="font-medium break-all">{userData.user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('account.userId')}</p>
                  <p className="font-mono text-xs text-muted-foreground break-all">
                    {userData.user.id}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card>
              <CardHeader>
                <CardTitle>{t('appearance.title')}</CardTitle>
                <CardDescription>{t('appearance.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ThemeSelector />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Profile Form */}
          <div className="lg:col-span-2">
            <ProfileForm profile={profile} />
          </div>
        </div>
      </div>
    </div>
  )
}
