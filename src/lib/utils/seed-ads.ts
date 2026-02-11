import { SupabaseClient } from '@supabase/supabase-js'

const SAMPLE_ADS = [
  {
    title_en: 'Happy Hour — 2 for 1 Cocktails',
    title_nl: 'Happy Hour — 2 voor 1 Cocktails',
    title_es: 'Happy Hour — 2x1 en Cócteles',
    title_de: 'Happy Hour — 2 für 1 Cocktails',
    description_en: 'Every day 17:00–19:00. All cocktails, two for the price of one!',
    description_nl: 'Elke dag 17:00–19:00. Alle cocktails, twee voor de prijs van één!',
    description_es: 'Todos los días 17:00–19:00. ¡Todos los cócteles, dos por uno!',
    description_de: 'Jeden Tag 17:00–19:00. Alle Cocktails, zwei zum Preis von einem!',
    cta_text_en: 'Reserve Now',
    cta_text_nl: 'Reserveer Nu',
    cta_text_es: 'Reserva Ahora',
    cta_text_de: 'Jetzt Reservieren',
    cta_url: '#booking-wizard',
    image_url: '/ads/happy-hour.jpg',
    template: 'happy_hour' as const,
    placement: 'banner_top' as const,
    display_pages: ['booking'],
    background_color: '#1a1a2e',
    text_color: '#ffffff',
    start_time: '17:00',
    end_time: '19:00',
    status: 'active' as const,
    priority: 10,
  },
  {
    title_en: 'Champions League — LIVE on 15 Screens',
    title_nl: 'Champions League — LIVE op 15 Schermen',
    title_es: 'Champions League — EN VIVO en 15 Pantallas',
    title_de: 'Champions League — LIVE auf 15 Bildschirmen',
    description_en: 'Watch every match with cold beers and great atmosphere!',
    description_nl: 'Bekijk elke wedstrijd met koud bier en geweldige sfeer!',
    description_es: '¡Mira cada partido con cervezas frías y gran ambiente!',
    description_de: 'Jedes Spiel mit kaltem Bier und toller Atmosphäre!',
    image_url: '/ads/champions-league.jpg',
    template: 'football_match' as const,
    placement: 'banner_top' as const,
    display_pages: ['digital_menu'],
    background_color: '#0d1b2a',
    text_color: '#ffffff',
    status: 'draft' as const,
    priority: 20,
  },
  {
    title_en: 'DJ Winston — Fri & Sat from 22:00',
    title_nl: 'DJ Winston — Vrij & Zat vanaf 22:00',
    title_es: 'DJ Winston — Vie & Sáb desde las 22:00',
    title_de: 'DJ Winston — Fr & Sa ab 22:00',
    description_en: 'Live DJ sets every weekend. Dance the night away on the beach!',
    description_nl: 'Live DJ-sets elk weekend. Dans de nacht weg op het strand!',
    description_es: '¡DJ en vivo cada fin de semana. ¡Baila toda la noche en la playa!',
    description_de: 'Live DJ-Sets jedes Wochenende. Tanzen Sie die Nacht am Strand!',
    image_url: '/ads/dj-night.jpg',
    template: 'custom' as const,
    placement: 'between_categories' as const,
    display_pages: ['digital_menu'],
    background_color: '#1b0d2a',
    text_color: '#ffffff',
    status: 'active' as const,
    priority: 5,
  },
  {
    title_en: 'Celebrate Your Birthday at Cheers!',
    title_nl: 'Vier Je Verjaardag bij Cheers!',
    title_es: '¡Celebra Tu Cumpleaños en Cheers!',
    title_de: 'Feiern Sie Ihren Geburtstag bei Cheers!',
    description_en: 'Free birthday cocktail + personalized decoration. Book your party now!',
    description_nl: 'Gratis verjaardagscocktail + persoonlijke decoratie. Boek nu je feest!',
    description_es: '¡Cóctel de cumpleaños gratis + decoración personalizada. ¡Reserva tu fiesta!',
    description_de: 'Gratis Geburtstags-Cocktail + persönliche Dekoration. Buchen Sie Ihre Party!',
    cta_text_en: 'Book Your Party',
    cta_text_nl: 'Boek Je Feest',
    cta_text_es: 'Reserva Tu Fiesta',
    cta_text_de: 'Party Buchen',
    cta_url: '#booking-wizard',
    image_url: '/ads/birthday.jpg',
    template: 'custom' as const,
    placement: 'fullscreen_overlay' as const,
    display_pages: ['booking'],
    background_color: '#2a1b0d',
    text_color: '#ffffff',
    status: 'draft' as const,
    priority: 15,
  },
]

export async function seedAds(supabase: SupabaseClient, force = false) {
  if (force) {
    await supabase.from('advertisements').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  }

  // Check if ads already exist
  const { count } = await supabase
    .from('advertisements')
    .select('*', { count: 'exact', head: true })

  if (count && count > 0 && !force) {
    return { message: `Skipped: ${count} ads already exist`, inserted: 0 }
  }

  const { data, error } = await supabase
    .from('advertisements')
    .insert(SAMPLE_ADS)
    .select('id')

  if (error) {
    throw new Error(`Failed to seed ads: ${error.message}`)
  }

  return { message: `Inserted ${data.length} sample ads`, inserted: data.length }
}
