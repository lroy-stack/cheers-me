'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ThumbsUp, Share2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useTranslations } from 'next-intl'

interface PostPreviewProps {
  caption: string
  imageUrl: string
  platform: 'instagram' | 'facebook' | 'multi'
  language: 'nl' | 'en' | 'es'
}

export function PostPreview({ caption, imageUrl, platform, language }: PostPreviewProps) {
  const t = useTranslations('marketing')
  const renderInstagramPreview = () => (
    <div className="bg-card dark:bg-neutral-900 rounded-lg shadow-lg overflow-hidden max-w-md mx-auto border border-neutral-200 dark:border-neutral-800">
      {/* Instagram Header */}
      <div className="flex items-center justify-between p-3 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder-avatar.jpg" />
            <AvatarFallback>CC</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold">cheersmallorca</p>
            <p className="text-xs text-muted-foreground">El Arenal, Mallorca</p>
          </div>
        </div>
        <MoreHorizontal className="h-5 w-5" />
      </div>

      {/* Instagram Image */}
      {imageUrl ? (
        <div className="aspect-square bg-neutral-100 dark:bg-neutral-800">
          <img
            src={imageUrl}
            alt="Post preview"
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-square bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">{t('postPreview.noImageUploaded')}</p>
        </div>
      )}

      {/* Instagram Actions */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Heart className="h-6 w-6 cursor-pointer hover:text-red-500 transition-colors" />
            <MessageCircle className="h-6 w-6 cursor-pointer" />
            <Send className="h-6 w-6 cursor-pointer" />
          </div>
          <Bookmark className="h-6 w-6 cursor-pointer" />
        </div>

        {/* Caption */}
        {caption && (
          <div className="text-sm">
            <span className="font-semibold">cheersmallorca </span>
            <span className="whitespace-pre-wrap">{caption}</span>
          </div>
        )}

        {!caption && (
          <p className="text-sm text-muted-foreground italic">
            {t('postPreview.captionPlaceholder')}
          </p>
        )}
      </div>
    </div>
  )

  const renderFacebookPreview = () => (
    <div className="bg-card dark:bg-neutral-900 rounded-lg shadow-lg overflow-hidden max-w-md mx-auto border border-neutral-200 dark:border-neutral-800">
      {/* Facebook Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-10 w-10">
              <AvatarImage src="/placeholder-avatar.jpg" />
              <AvatarFallback>CC</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">GrandCafe Cheers Mallorca</p>
              <p className="text-xs text-muted-foreground">{t('postPreview.justNow')} · 🌍</p>
            </div>
          </div>
          <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Caption (Facebook shows text before image) */}
        {caption ? (
          <p className="text-sm whitespace-pre-wrap">{caption}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            {t('postPreview.captionPlaceholder')}
          </p>
        )}
      </div>

      {/* Facebook Image */}
      {imageUrl ? (
        <div className="relative w-full" style={{ maxHeight: '500px' }}>
          <img
            src={imageUrl}
            alt="Post preview"
            className="w-full h-auto object-contain bg-neutral-100 dark:bg-neutral-800"
          />
        </div>
      ) : (
        <div className="w-full h-64 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">{t('postPreview.noImageUploaded')}</p>
        </div>
      )}

      {/* Facebook Actions */}
      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-around">
          <button className="flex items-center gap-2 px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors">
            <ThumbsUp className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">{t('postPreview.like')}</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors">
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">{t('postPreview.comment')}</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors">
            <Share2 className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">{t('postPreview.share')}</span>
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t('createPost.preview')}</CardTitle>
          <Badge variant="outline" className="uppercase text-xs">
            {language}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {platform === 'multi' ? (
          <Tabs defaultValue="instagram" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="instagram">{t('contentCalendar.instagram')}</TabsTrigger>
              <TabsTrigger value="facebook">{t('contentCalendar.facebook')}</TabsTrigger>
            </TabsList>
            <TabsContent value="instagram" className="mt-0">
              {renderInstagramPreview()}
            </TabsContent>
            <TabsContent value="facebook" className="mt-0">
              {renderFacebookPreview()}
            </TabsContent>
          </Tabs>
        ) : platform === 'instagram' ? (
          renderInstagramPreview()
        ) : (
          renderFacebookPreview()
        )}

        {/* Preview Notes */}
        <div className="mt-4 p-3 bg-muted rounded-md">
          <p className="text-xs text-muted-foreground">
            <strong>{t('postPreview.disclaimerNote')}</strong> {t('postPreview.disclaimer')}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
