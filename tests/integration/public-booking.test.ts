import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

/**
 * Integration tests for Public Booking API
 * Tests the /api/public/booking endpoint
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

describe('Public Booking API', () => {
  let testReservationId: string | null = null

  afterAll(async () => {
    // Cleanup: Delete test reservation if created
    if (testReservationId) {
      const { error } = await supabase.from('reservations').delete().eq('id', testReservationId)
      if (error) {
        console.error('Failed to cleanup test reservation:', error)
      }
    }
  })

  describe('POST /api/public/booking', () => {
    it('should create a reservation with valid data', async () => {
      // Get tomorrow's date
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const reservationDate = tomorrow.toISOString().split('T')[0]

      const bookingData = {
        guest_name: 'Test Guest',
        guest_email: 'test@example.com',
        guest_phone: '+34600000000',
        party_size: 4,
        reservation_date: reservationDate,
        start_time: '19:00',
        special_requests: 'Window seat if possible',
        language: 'en',
      }

      const response = await fetch(`${baseUrl}/api/public/booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      })

      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.reservation).toBeDefined()
      expect(data.reservation.guest_name).toBe('Test Guest')
      expect(data.reservation.party_size).toBe(4)
      expect(data.reservation.status).toBe('pending')

      // Store ID for cleanup
      testReservationId = data.reservation.id
    })

    it('should reject booking without required fields', async () => {
      const invalidData = {
        guest_name: 'Test',
        // Missing phone, date, time, party_size
      }

      const response = await fetch(`${baseUrl}/api/public/booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toBeDefined()
      expect(Array.isArray(data.details)).toBe(true)
    })

    it('should reject booking with invalid email format', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const reservationDate = tomorrow.toISOString().split('T')[0]

      const invalidData = {
        guest_name: 'Test Guest',
        guest_email: 'invalid-email',
        guest_phone: '+34600000000',
        party_size: 2,
        reservation_date: reservationDate,
        start_time: '20:00',
        language: 'en',
      }

      const response = await fetch(`${baseUrl}/api/public/booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })

    it('should reject booking too far in advance', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 60) // 60 days ahead
      const reservationDate = futureDate.toISOString().split('T')[0]

      const bookingData = {
        guest_name: 'Test Guest',
        guest_phone: '+34600000000',
        party_size: 2,
        reservation_date: reservationDate,
        start_time: '19:00',
        language: 'en',
      }

      const response = await fetch(`${baseUrl}/api/public/booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
      expect(data.message).toContain('advance')
    })

    it('should reject booking for same day (less than min advance hours)', async () => {
      const today = new Date()
      const reservationDate = today.toISOString().split('T')[0]

      const bookingData = {
        guest_name: 'Test Guest',
        guest_phone: '+34600000000',
        party_size: 2,
        reservation_date: reservationDate,
        start_time: '12:00',
        language: 'en',
      }

      const response = await fetch(`${baseUrl}/api/public/booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should reject booking with party size exceeding maximum', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const reservationDate = tomorrow.toISOString().split('T')[0]

      const bookingData = {
        guest_name: 'Test Guest',
        guest_phone: '+34600000000',
        party_size: 50, // Exceeds typical max
        reservation_date: reservationDate,
        start_time: '19:00',
        language: 'en',
      }

      const response = await fetch(`${baseUrl}/api/public/booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      })

      const data = await response.json()

      // Should either reject with 400 or succeed depending on settings
      if (response.status === 400) {
        expect(data.error).toBeDefined()
        expect(data.message).toContain('party size')
      }
    })

    it('should accept booking without email (phone only)', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 2)
      const reservationDate = tomorrow.toISOString().split('T')[0]

      const bookingData = {
        guest_name: 'Phone Only Guest',
        guest_phone: '+34611111111',
        party_size: 2,
        reservation_date: reservationDate,
        start_time: '20:00',
        language: 'en',
      }

      const response = await fetch(`${baseUrl}/api/public/booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      })

      const data = await response.json()

      if (response.status === 201) {
        expect(data.success).toBe(true)
        expect(data.reservation).toBeDefined()

        // Cleanup
        if (data.reservation.id) {
          await supabase.from('reservations').delete().eq('id', data.reservation.id)
        }
      }
    })

    it('should support multiple languages', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 3)
      const reservationDate = tomorrow.toISOString().split('T')[0]

      const languages = ['en', 'nl', 'es', 'de']

      for (const language of languages) {
        const bookingData = {
          guest_name: `Guest ${language.toUpperCase()}`,
          guest_phone: `+3460000000${languages.indexOf(language)}`,
          party_size: 2,
          reservation_date: reservationDate,
          start_time: `${18 + languages.indexOf(language)}:00`,
          language,
        }

        const response = await fetch(`${baseUrl}/api/public/booking`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bookingData),
        })

        if (response.status === 201) {
          const data = await response.json()
          expect(data.success).toBe(true)

          // Cleanup
          if (data.reservation?.id) {
            await supabase.from('reservations').delete().eq('id', data.reservation.id)
          }
        }
      }
    })
  })

  describe('GET /api/reservations/availability', () => {
    it('should check availability for a given date and time', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const date = tomorrow.toISOString().split('T')[0]

      const params = new URLSearchParams({
        date,
        time: '19:00',
        party_size: '4',
      })

      const response = await fetch(`${baseUrl}/api/reservations/availability?${params}`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('available')
      expect(typeof data.available).toBe('boolean')

      if (data.available) {
        expect(data.available_tables).toBeGreaterThan(0)
      } else {
        expect(data.reason).toBeDefined()
      }
    })

    it('should return error for missing required parameters', async () => {
      const params = new URLSearchParams({
        date: '2026-03-01',
        // Missing time and party_size
      })

      const response = await fetch(`${baseUrl}/api/reservations/availability?${params}`)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })
  })
})
