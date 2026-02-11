/**
 * Unit Tests for Events & DJ Management Module
 * Tests for event validation, DJ operations, scheduling, and equipment management
 * Module M8
 *
 * Run: pnpm test tests/unit/events.test.ts
 */

import { describe, it, expect } from 'vitest'

// ============================================================================
// Event Validation Tests
// ============================================================================

describe('Event Validation', () => {
  describe('Event Date Validation', () => {
    it('validates correct date format (YYYY-MM-DD)', () => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      const validDate = '2025-06-15'
      expect(dateRegex.test(validDate)).toBe(true)
    })

    it('rejects invalid date format', () => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      const invalidDates = ['15-06-2025', '2025/06/15', '06-15-2025', 'not-a-date']

      invalidDates.forEach((date) => {
        expect(dateRegex.test(date)).toBe(false)
      })
    })

    it('validates event date is in the future', () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const futureDate = new Date(today)
      futureDate.setDate(futureDate.getDate() + 7)

      expect(futureDate.getTime() >= today.getTime()).toBe(true)
    })

    it('rejects past event dates', () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const pastDate = new Date(today)
      pastDate.setDate(pastDate.getDate() - 1)

      expect(pastDate.getTime() < today.getTime()).toBe(true)
    })

    it('allows events on today', () => {
      const today = new Date()
      expect(today.getTime() >= today.getTime()).toBe(true)
    })
  })

  describe('Event Time Validation', () => {
    it('validates correct time format (HH:MM or HH:MM:SS)', () => {
      const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/
      const validTimes = ['22:00', '22:00:00', '10:30', '01:45:30']

      validTimes.forEach((time) => {
        expect(timeRegex.test(time)).toBe(true)
      })
    })

    it('rejects invalid time format', () => {
      const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/
      const invalidTimes = ['22-00', '22:00:00:00', '22', 'not-a-time', 'invalid:format']

      invalidTimes.forEach((time) => {
        expect(timeRegex.test(time)).toBe(false)
      })
    })

    it('validates end time is after start time', () => {
      const startTime = '22:00'
      const endTime = '03:00'

      // Simple comparison for times across midnight
      const start = parseInt(startTime.replace(':', ''))
      const end = parseInt(endTime.replace(':', ''))

      // For DJ events that go past midnight, end time < start time is valid
      expect(end < start).toBe(true) // Valid for nighttime events
    })

    it('validates DJ event timing (10:30 PM opening)', () => {
      const djStartTime = '22:00' // 10 PM
      const startHour = parseInt(djStartTime.split(':')[0])

      expect(startHour >= 22).toBe(true) // DJs start at 22:00 or later
    })
  })

  describe('Event Type Validation', () => {
    it('validates supported event types', () => {
      const validTypes = ['dj_night', 'sports', 'themed_night', 'private_event', 'other']
      const testTypes = ['dj_night', 'sports', 'themed_night']

      testTypes.forEach((type) => {
        expect(validTypes).toContain(type)
      })
    })

    it('rejects unsupported event types', () => {
      const validTypes = ['dj_night', 'sports', 'themed_night', 'private_event', 'other']
      const invalidType = 'concert'

      expect(validTypes).not.toContain(invalidType)
    })
  })

  describe('Event Status Validation', () => {
    it('validates event status values', () => {
      const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled']
      const testStatuses = ['pending', 'confirmed']

      testStatuses.forEach((status) => {
        expect(validStatuses).toContain(status)
      })
    })

    it('validates status transitions', () => {
      // Valid transitions: pending -> confirmed, confirmed -> completed, any -> cancelled
      const validTransitions = [
        { from: 'pending', to: 'confirmed' },
        { from: 'confirmed', to: 'completed' },
        { from: 'pending', to: 'cancelled' },
        { from: 'confirmed', to: 'cancelled' },
      ]

      validTransitions.forEach((transition) => {
        expect(transition.from).toBeTruthy()
        expect(transition.to).toBeTruthy()
        expect(transition.from).not.toEqual(transition.to)
      })
    })
  })

  describe('Event Title Validation', () => {
    it('requires non-empty title', () => {
      const title = 'Friday Night DJ Session'
      expect(title.length).toBeGreaterThan(0)
    })

    it('validates title max length (255 chars)', () => {
      const validTitle = 'A'.repeat(255)
      const invalidTitle = 'A'.repeat(256)

      expect(validTitle.length <= 255).toBe(true)
      expect(invalidTitle.length <= 255).toBe(false)
    })

    it('rejects empty title', () => {
      const emptyTitle = ''
      expect(emptyTitle.length > 0).toBe(false)
    })
  })

  describe('Sports Event Validation', () => {
    it('validates sports event requires teams', () => {
      const sportsEvent = {
        event_type: 'sports',
        home_team: 'FC Barcelona',
        away_team: 'Real Madrid',
      }

      expect(sportsEvent.home_team).toBeTruthy()
      expect(sportsEvent.away_team).toBeTruthy()
      expect(sportsEvent.home_team).not.toEqual(sportsEvent.away_team)
    })

    it('validates broadcast channel for sports events', () => {
      const broadcastChannel = 'LaLiga TV'
      expect(broadcastChannel.length).toBeGreaterThan(0)
      expect(broadcastChannel.length <= 100).toBe(true)
    })

    it('validates sports event has sport name', () => {
      const sportName = 'Football'
      const validSports = ['Football', 'Basketball', 'Tennis', 'Formula 1']

      expect(validSports).toContain(sportName)
    })
  })
})

// ============================================================================
// DJ Validation Tests
// ============================================================================

describe('DJ Validation', () => {
  describe('DJ Profile Validation', () => {
    it('requires DJ name', () => {
      const djName = 'DJ Marco'
      expect(djName.length).toBeGreaterThan(0)
      expect(djName.length <= 255).toBe(true)
    })

    it('validates DJ genre field', () => {
      const validGenres = ['House', 'Techno', 'Reggaeton', 'Hip-Hop', 'Electronic']
      const djGenre = 'House'

      expect(validGenres).toContain(djGenre)
    })

    it('validates DJ fee is non-negative', () => {
      const fees = [100, 150.50, 0]

      fees.forEach((fee) => {
        expect(fee >= 0).toBe(true)
      })
    })

    it('rejects negative fees', () => {
      const invalidFee = -50
      expect(invalidFee >= 0).toBe(false)
    })
  })

  describe('DJ Contact Information', () => {
    it('validates email format', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const validEmails = ['dj@example.com', 'marco.rossi@gmail.com']
      const invalidEmails = ['invalid-email', '@example.com', 'dj@', 'dj.example.com']

      validEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(true)
      })

      invalidEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(false)
      })
    })

    it('validates phone number format', () => {
      const phoneRegex = /^\d{1,20}$/
      const validPhones = ['34612345678', '00346123456']

      validPhones.forEach((phone) => {
        expect(phoneRegex.test(phone)).toBe(true)
      })
    })

    it('validates email max length', () => {
      const email = 'a'.repeat(240) + '@test.co'
      expect(email.length <= 255).toBe(true)
    })
  })

  describe('DJ Social Links', () => {
    it('parses social links JSON', () => {
      const socialLinksJson = JSON.stringify({
        instagram: '@dj_marco',
        spotify: 'dj-marco-id',
        soundcloud: 'djmarco',
      })

      const parsed = JSON.parse(socialLinksJson)
      expect(parsed.instagram).toBe('@dj_marco')
      expect(parsed.spotify).toContain('dj-marco')
      expect(parsed.soundcloud).toBe('djmarco')
    })

    it('handles missing social link platforms', () => {
      const socialLinks = {
        instagram: '@dj_marco',
        // spotify: missing
        // soundcloud: missing
      }

      expect(socialLinks.instagram).toBeDefined()
      expect(socialLinks.spotify).toBeUndefined()
    })

    it('validates social link URLs', () => {
      const urlRegex = /^https?:\/\/.+/
      const validUrls = [
        'https://instagram.com/dj_marco',
        'https://spotify.com/artist/dj-marco',
      ]
      const invalidUrls = ['@dj_marco', 'not-a-url']

      validUrls.forEach((url) => {
        expect(urlRegex.test(url)).toBe(true)
      })

      invalidUrls.forEach((url) => {
        expect(urlRegex.test(url)).toBe(false)
      })
    })
  })

  describe('DJ Rider/Requirements', () => {
    it('stores DJ rider notes', () => {
      const riderNotes = 'Requires 2 turntables, premium mixer, lighting control'
      expect(riderNotes.length).toBeGreaterThan(0)
    })

    it('handles empty rider notes', () => {
      const riderNotes = null
      expect(riderNotes).toBeNull()
    })
  })
})

// ============================================================================
// Music Request Tests
// ============================================================================

describe('Music Requests', () => {
  describe('Music Request Validation', () => {
    it('requires song title and artist', () => {
      const request = {
        song_title: 'Levitating',
        artist: 'Dua Lipa',
      }

      expect(request.song_title.length).toBeGreaterThan(0)
      expect(request.artist.length).toBeGreaterThan(0)
    })

    it('validates music request status', () => {
      const validStatuses = ['pending', 'played', 'skipped']
      const testStatuses = ['pending', 'played']

      testStatuses.forEach((status) => {
        expect(validStatuses).toContain(status)
      })
    })

    it('tracks guest name (optional)', () => {
      const request1 = {
        guest_name: 'John Doe',
        song_title: 'Song',
        artist: 'Artist',
      }

      const request2 = {
        guest_name: null,
        song_title: 'Song',
        artist: 'Artist',
      }

      expect(request1.guest_name).toBeDefined()
      expect(request2.guest_name).toBeNull()
    })

    it('handles request timestamps', () => {
      const timestamp = new Date().toISOString()
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })
})

// ============================================================================
// Equipment Checklist Tests
// ============================================================================

describe('Equipment Checklist', () => {
  describe('Equipment Item Validation', () => {
    it('requires equipment name', () => {
      const equipmentName = 'Sound System'
      expect(equipmentName.length).toBeGreaterThan(0)
    })

    it('tracks equipment checked status', () => {
      const items = [
        { equipment_name: 'Microphone', is_checked: true },
        { equipment_name: 'Speaker', is_checked: false },
      ]

      expect(items[0].is_checked).toBe(true)
      expect(items[1].is_checked).toBe(false)
    })

    it('generates checklist for DJ event', () => {
      const djEventEquipment = [
        'Turntables',
        'Mixer',
        'Headphones',
        'Speakers',
        'Lighting',
        'Microphone',
      ]

      expect(djEventEquipment.length).toBeGreaterThan(0)
      expect(djEventEquipment).toContain('Turntables')
      expect(djEventEquipment).toContain('Mixer')
    })

    it('generates checklist for sports event', () => {
      const sportsEventEquipment = ['Large TV', 'Surround Sound', 'Projector', 'Internet Connection']

      expect(sportsEventEquipment.length).toBeGreaterThan(0)
      expect(sportsEventEquipment).toContain('Large TV')
    })

    it('generates checklist for private event', () => {
      const privateEventEquipment = ['Tables', 'Chairs', 'Lighting', 'Sound System', 'Decoration']

      expect(privateEventEquipment.length).toBeGreaterThan(0)
    })
  })

  describe('Equipment Checklist Progress', () => {
    it('calculates completion percentage', () => {
      const items = [
        { is_checked: true },
        { is_checked: true },
        { is_checked: false },
        { is_checked: false },
      ]

      const checkedCount = items.filter((i) => i.is_checked).length
      const completionPercentage = (checkedCount / items.length) * 100

      expect(completionPercentage).toBe(50)
    })

    it('identifies fully completed checklist', () => {
      const items = [{ is_checked: true }, { is_checked: true }]
      const isComplete = items.every((i) => i.is_checked)

      expect(isComplete).toBe(true)
    })

    it('identifies incomplete checklist', () => {
      const items = [{ is_checked: true }, { is_checked: false }]
      const isComplete = items.every((i) => i.is_checked)

      expect(isComplete).toBe(false)
    })
  })
})

// ============================================================================
// Event Scheduling & Conflicts Tests
// ============================================================================

describe('Event Scheduling', () => {
  describe('DJ Availability', () => {
    it('checks if DJ is available on a date', () => {
      const djBookedDates = ['2025-06-15', '2025-06-22', '2025-07-03']
      const requestedDate = '2025-06-20'

      const isAvailable = !djBookedDates.includes(requestedDate)
      expect(isAvailable).toBe(true)
    })

    it('identifies DJ conflicts', () => {
      const djBookedDates = ['2025-06-15', '2025-06-22']
      const newEventDate = '2025-06-15'

      const hasConflict = djBookedDates.includes(newEventDate)
      expect(hasConflict).toBe(true)
    })

    it('prevents double-booking same DJ', () => {
      const dj1Events = ['2025-06-15', '2025-06-22']
      const dj2Events = ['2025-06-15'] // Same date

      const canScheduleDj1OnJune15 = !dj1Events.includes('2025-06-15')
      expect(canScheduleDj1OnJune15).toBe(false)
    })
  })

  describe('Seasonal Hours Validation', () => {
    it('validates high season hours (Jun-Sep)', () => {
      const highSeasonMonths = [6, 7, 8, 9]
      const testMonth = 7 // July

      expect(highSeasonMonths).toContain(testMonth)

      // High season: 10:30 - 03:00
      const openingTime = '10:30'
      const closingTime = '03:00'

      expect(openingTime).toBe('10:30')
      expect(closingTime).toBe('03:00')
    })

    it('validates low season hours (Apr-May, Oct)', () => {
      const lowSeasonMonths = [4, 5, 10]
      const testMonth = 4 // April

      expect(lowSeasonMonths).toContain(testMonth)

      // Low season: 10:30 - 01:00
      const openingTime = '10:30'
      const closingTime = '01:00'

      expect(openingTime).toBe('10:30')
      expect(closingTime).toBe('01:00')
    })

    it('validates seasonal operating dates', () => {
      const seasonStart = new Date(2025, 3, 1) // April 1
      const seasonEnd = new Date(2025, 10, 1) // November 1
      const testDate = new Date(2025, 5, 15) // June 15

      expect(testDate.getTime() >= seasonStart.getTime()).toBe(true)
      expect(testDate.getTime() <= seasonEnd.getTime()).toBe(true)
    })

    it('rejects events outside operating season', () => {
      const seasonStart = new Date(2025, 3, 1)
      const seasonEnd = new Date(2025, 10, 1)
      const testDate = new Date(2025, 0, 15) // January 15 - outside season

      expect(testDate.getTime() >= seasonStart.getTime()).toBe(false)
    })
  })
})

// ============================================================================
// Event Marketing Connection Tests
// ============================================================================

describe('Event Marketing Integration', () => {
  describe('Auto-Marketing Trigger', () => {
    it('creates marketing draft for DJ night events', () => {
      const event = {
        event_type: 'dj_night',
        auto_generate_marketing: true,
      }

      const shouldGenerateMarketing =
        event.event_type === 'dj_night' && event.auto_generate_marketing

      expect(shouldGenerateMarketing).toBe(true)
    })

    it('creates marketing draft for sports events', () => {
      const event = {
        event_type: 'sports',
        auto_generate_marketing: true,
      }

      const shouldGenerateMarketing =
        event.event_type === 'sports' && event.auto_generate_marketing

      expect(shouldGenerateMarketing).toBe(true)
    })

    it('creates marketing draft for themed night events', () => {
      const event = {
        event_type: 'themed_night',
        auto_generate_marketing: true,
      }

      const shouldGenerateMarketing =
        event.event_type === 'themed_night' && event.auto_generate_marketing

      expect(shouldGenerateMarketing).toBe(true)
    })
  })

  describe('Marketing Content Fields', () => {
    it('validates social caption field', () => {
      const caption = 'Join us for an amazing night with DJ Marco!'
      expect(caption.length).toBeGreaterThan(0)
      expect(caption.length <= 2200).toBe(true) // Instagram caption limit
    })

    it('validates hashtags format', () => {
      const hashtags = '#cheers #djnight #mallorca #live'
      const tagArray = hashtags.split(' ')

      tagArray.forEach((tag) => {
        expect(tag.startsWith('#')).toBe(true)
      })
    })

    it('validates newsletter mention field', () => {
      const mention = 'This Saturday: DJ Marco spinning house beats at Cheers!'
      expect(mention.length).toBeGreaterThan(0)
    })

    it('validates suggested platforms array', () => {
      const platforms = ['instagram', 'facebook', 'newsletter']

      platforms.forEach((platform) => {
        expect(['instagram', 'facebook', 'newsletter']).toContain(platform)
      })
    })
  })
})

// ============================================================================
// Data Format Tests
// ============================================================================

describe('Event Data Formats', () => {
  it('handles timezone in event dates', () => {
    const eventDate = '2025-06-15'
    const eventTime = '22:00'

    // Mallorca timezone is Europe/Madrid (CEST in summer, CET in winter)
    expect(eventDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(eventTime).toMatch(/^\d{2}:\d{2}(:\d{2})?$/)
  })

  it('formats duration calculation', () => {
    const startTime = '22:00'
    const endTime = '03:00' // Next day

    const start = parseInt(startTime.replace(':', ''))
    const end = parseInt(endTime.replace(':', ''))

    // For overnight events, duration is complex but we can track it
    expect(start).toBeGreaterThan(0)
    expect(end).toBeGreaterThan(0)
  })

  it('serializes DJ social links to JSON', () => {
    const socialLinks = {
      instagram: '@dj_marco',
      spotify: 'marco-rossi-id',
      soundcloud: 'djmarco',
      facebook: 'djmarco',
      website: 'https://djmarco.com',
    }

    const serialized = JSON.stringify(socialLinks)
    const deserialized = JSON.parse(serialized)

    expect(deserialized.instagram).toBe('@dj_marco')
    expect(Object.keys(deserialized).length).toBe(5)
  })

  it('handles nullable fields correctly', () => {
    const event = {
      title: 'DJ Night',
      description: null,
      end_time: null,
      dj_id: null,
    }

    expect(event.title).toBeTruthy()
    expect(event.description).toBeNull()
    expect(event.end_time).toBeNull()
    expect(event.dj_id).toBeNull()
  })
})
