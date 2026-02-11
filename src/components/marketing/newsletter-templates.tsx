'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface Template {
  id: string
  nameKey: string
  descriptionKey: string
  subject: string
  content: string
  html: string
}

const templates: Template[] = [
  {
    id: 'weekly-events',
    nameKey: 'weeklyEvents',
    descriptionKey: 'weeklyEventsDesc',
    subject: 'This Week at Cheers: DJs, Events & Specials',
    content: `Hey there! 🎉

Here's what's happening this week at GrandCafe Cheers:

🎵 DJ LINEUP:
- Thursday: DJ [Name] - House & Deep House
- Friday: DJ [Name] - Techno & Progressive
- Saturday: DJ [Name] - Commercial & Classics

🍺 SPECIAL OFFERS:
- Happy Hour 17:00-19:00 daily
- 2-for-1 Craft Beers on Wednesdays
- Live Sports on the big screen

We can't wait to see you!

Cheers,
The Cheers Team`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #F59E0B;">This Week at Cheers</h2>
  <p>Hey there! 🎉</p>
  <h3>🎵 DJ LINEUP</h3>
  <ul>
    <li>Thursday: DJ [Name] - House & Deep House</li>
    <li>Friday: DJ [Name] - Techno & Progressive</li>
    <li>Saturday: DJ [Name] - Commercial & Classics</li>
  </ul>
  <h3>🍺 SPECIAL OFFERS</h3>
  <ul>
    <li>Happy Hour 17:00-19:00 daily</li>
    <li>2-for-1 Craft Beers on Wednesdays</li>
    <li>Live Sports on the big screen</li>
  </ul>
  <p>We can't wait to see you!</p>
  <p><strong>Cheers,<br>The Cheers Team</strong></p>
</div>`,
  },
  {
    id: 'new-menu',
    nameKey: 'newMenuLaunch',
    descriptionKey: 'newMenuLaunchDesc',
    subject: 'New Menu Alert: Fresh Flavors at Cheers!',
    content: `Hi Food Lovers! 🍴

We're excited to announce our NEW menu is here!

✨ NEW DISHES:
- Gourmet Burgers with craft toppings
- Fresh Salad Selection
- International Breakfast options
- Classic Schnitzel variations

🍺 CRAFT BEER UPDATE:
22 rotating craft beers on tap - ask our staff for recommendations!

Book your table now and be one of the first to try our new dishes.

Looking forward to serving you!

GrandCafe Cheers`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #F59E0B;">New Menu Alert! 🍴</h2>
  <p>Hi Food Lovers!</p>
  <p>We're excited to announce our <strong>NEW menu</strong> is here!</p>
  <h3>✨ NEW DISHES</h3>
  <ul>
    <li>Gourmet Burgers with craft toppings</li>
    <li>Fresh Salad Selection</li>
    <li>International Breakfast options</li>
    <li>Classic Schnitzel variations</li>
  </ul>
  <h3>🍺 CRAFT BEER UPDATE</h3>
  <p>22 rotating craft beers on tap - ask our staff for recommendations!</p>
  <p style="background: #FEF3C7; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <strong>Book your table now</strong> and be one of the first to try our new dishes.
  </p>
  <p>Looking forward to serving you!</p>
  <p><strong>GrandCafe Cheers</strong></p>
</div>`,
  },
  {
    id: 'summer-opening',
    nameKey: 'seasonOpening',
    descriptionKey: 'seasonOpeningDesc',
    subject: 'We\'re Back! Season 2024 at Cheers Mallorca',
    content: `Welcome Back to Paradise! ☀️

We're thrilled to announce that GrandCafe Cheers is OPEN for the season!

🌊 LOCATION:
Carrer de Cartago 22, El Arenal (Platja de Palma)

⏰ HOURS:
Daily 10:30 - 03:00 (High Season)
Kitchen open all day!

🎵 ENTERTAINMENT:
Live DJs every night from 22:00
Sports broadcasts on big screens
Weekly special events

Whether you're here for breakfast, lunch, dinner, or late-night drinks, we've got you covered.

See you soon at the beach!

Cheers! 🍻
Team Cheers Mallorca`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(to bottom, #FEF3C7, white); padding: 20px;">
  <h1 style="color: #F59E0B; text-align: center;">We're Back! ☀️</h1>
  <p style="text-align: center; font-size: 18px;">Welcome to Season 2024</p>

  <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
    <h3>🌊 LOCATION</h3>
    <p>Carrer de Cartago 22, El Arenal (Platja de Palma)</p>

    <h3>⏰ HOURS</h3>
    <p>Daily 10:30 - 03:00 (High Season)<br>Kitchen open all day!</p>

    <h3>🎵 ENTERTAINMENT</h3>
    <ul>
      <li>Live DJs every night from 22:00</li>
      <li>Sports broadcasts on big screens</li>
      <li>Weekly special events</li>
    </ul>
  </div>

  <p style="text-align: center; font-size: 16px;">
    Whether you're here for breakfast, lunch, dinner, or late-night drinks,<br>
    <strong>we've got you covered.</strong>
  </p>

  <p style="text-align: center;">See you soon at the beach! 🍻</p>
  <p style="text-align: center;"><strong>Team Cheers Mallorca</strong></p>
</div>`,
  },
  {
    id: 'thank-you',
    nameKey: 'thankYou',
    descriptionKey: 'thankYouDesc',
    subject: 'Thank You for an Amazing Season! 🙏',
    content: `Dear Cheers Family,

As we close the doors for this season, we want to say a huge THANK YOU! 🙏

This summer has been incredible thanks to YOU:
- 214 amazing days of service
- Thousands of smiles and memories
- New friends from around the world
- Unforgettable nights with incredible music

We'll be back April 1st, 2024 with:
✨ New menu items
✨ Fresh DJ lineup
✨ Even better vibes

Stay connected:
📱 Instagram: @cheersmallorca
📧 Sign up for early bird specials

Until next season... Cheers! 🍻

With gratitude,
Leroy & The Cheers Team`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #F59E0B; text-align: center;">Thank You! 🙏</h2>
  <p>Dear Cheers Family,</p>
  <p>As we close the doors for this season, we want to say a huge <strong>THANK YOU!</strong></p>

  <div style="background: #FEF3C7; padding: 20px; border-radius: 10px; margin: 20px 0;">
    <p style="margin: 0;"><strong>This summer has been incredible thanks to YOU:</strong></p>
    <ul style="margin: 10px 0;">
      <li>214 amazing days of service</li>
      <li>Thousands of smiles and memories</li>
      <li>New friends from around the world</li>
      <li>Unforgettable nights with incredible music</li>
    </ul>
  </div>

  <h3>We'll be back April 1st, 2024 with:</h3>
  <ul>
    <li>✨ New menu items</li>
    <li>✨ Fresh DJ lineup</li>
    <li>✨ Even better vibes</li>
  </ul>

  <div style="text-align: center; margin: 30px 0;">
    <p><strong>Stay connected:</strong></p>
    <p>📱 Instagram: <a href="https://instagram.com/cheersmallorca" style="color: #F59E0B;">@cheersmallorca</a></p>
    <p>📧 Sign up for early bird specials</p>
  </div>

  <p style="text-align: center; font-size: 18px;">Until next season... Cheers! 🍻</p>
  <p style="text-align: center;"><strong>With gratitude,<br>Leroy & The Cheers Team</strong></p>
</div>`,
  },
]

interface NewsletterTemplatesProps {
  onApplyTemplate: (template: { subject: string; content: string; html: string }) => void
}

export function NewsletterTemplates({ onApplyTemplate }: NewsletterTemplatesProps) {
  const t = useTranslations('marketing.templates')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t(template.nameKey)}</CardTitle>
                <CardDescription className="text-xs">{t(template.descriptionKey)}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    onApplyTemplate({
                      subject: template.subject,
                      content: template.content,
                      html: template.html,
                    })
                  }
                >
                  {t('useTemplate')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
