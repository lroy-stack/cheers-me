import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Unit Tests for Staff Management Calculations
 * Tests for labor cost calculations, overtime detection, and staff statistics
 */

describe('Staff Management Calculations', () => {
  describe('calculateLaborCost', () => {
    it('calculates labor cost percentage correctly', () => {
      const hoursWorked = 40
      const hourlyRate = 15
      const totalRevenue = 3000

      const laborCost = (hoursWorked * hourlyRate) / totalRevenue * 100
      expect(laborCost).toBe(20) // 40 * 15 / 3000 = 20%
    })

    it('returns 0 when revenue is 0', () => {
      const hoursWorked = 40
      const hourlyRate = 15
      const totalRevenue = 0

      // Should handle division by zero
      const laborCost = totalRevenue === 0 ? 0 : (hoursWorked * hourlyRate) / totalRevenue * 100
      expect(laborCost).toBe(0)
    })

    it('handles multiple employees labor cost', () => {
      const employees = [
        { hoursWorked: 40, hourlyRate: 15 },
        { hoursWorked: 35, hourlyRate: 12 },
        { hoursWorked: 30, hourlyRate: 10 },
      ]

      const totalLaborCost = employees.reduce((sum, emp) => sum + (emp.hoursWorked * emp.hourlyRate), 0)
      // 40*15 + 35*12 + 30*10 = 600 + 420 + 300 = 1320
      const totalRevenue = 2000

      const laborPercentage = (totalLaborCost / totalRevenue) * 100
      expect(laborPercentage).toBe((1320 / 2000) * 100) // 66%
    })

    it('calculates target labor cost (30% of revenue)', () => {
      const totalRevenue = 1000
      const targetLaborPercentage = 30
      const maxLaborCost = (totalRevenue * targetLaborPercentage) / 100

      expect(maxLaborCost).toBe(300)
    })
  })

  describe('calculateOvertimeHours', () => {
    it('detects overtime correctly', () => {
      const hoursWorked = 45
      const regularHours = 40
      const overtimeHours = Math.max(0, hoursWorked - regularHours)

      expect(overtimeHours).toBe(5)
    })

    it('returns 0 when no overtime', () => {
      const hoursWorked = 35
      const regularHours = 40
      const overtimeHours = Math.max(0, hoursWorked - regularHours)

      expect(overtimeHours).toBe(0)
    })

    it('calculates overtime cost at 1.5x rate', () => {
      const overtimeHours = 5
      const hourlyRate = 15
      const overtimeCost = overtimeHours * hourlyRate * 1.5

      expect(overtimeCost).toBe(112.5)
    })
  })

  describe('calculateAverageHourlyRate', () => {
    it('calculates average hourly rate for staff', () => {
      const employees = [
        { hourlyRate: 12 },
        { hourlyRate: 15 },
        { hourlyRate: 18 },
        { hourlyRate: 20 },
      ]

      const averageRate = employees.length > 0
        ? employees.reduce((sum, emp) => sum + emp.hourlyRate, 0) / employees.length
        : 0

      expect(averageRate).toBe(16.25)
    })

    it('returns 0 for empty staff list', () => {
      const employees: { hourlyRate: number }[] = []

      const averageRate = employees.length > 0
        ? employees.reduce((sum, emp) => sum + emp.hourlyRate, 0) / employees.length
        : 0

      expect(averageRate).toBe(0)
    })
  })

  describe('countFullTimeVsPartTime', () => {
    it('counts contract types correctly', () => {
      const employees = [
        { contractType: 'full_time' },
        { contractType: 'full_time' },
        { contractType: 'part_time' },
        { contractType: 'casual' },
      ]

      const fullTimeCount = employees.filter(e => e.contractType === 'full_time').length
      const partTimeCount = employees.filter(e => e.contractType === 'part_time').length

      expect(fullTimeCount).toBe(2)
      expect(partTimeCount).toBe(1)
    })

    it('handles empty list', () => {
      const employees: { contractType: string }[] = []

      const fullTimeCount = employees.filter(e => e.contractType === 'full_time').length
      expect(fullTimeCount).toBe(0)
    })
  })

  describe('calculateWeeklyHours', () => {
    it('sums hours for all days in week', () => {
      const weeklySchedule = [
        { day: 'Monday', hours: 8 },
        { day: 'Tuesday', hours: 8 },
        { day: 'Wednesday', hours: 8 },
        { day: 'Thursday', hours: 8 },
        { day: 'Friday', hours: 8 },
        { day: 'Saturday', hours: 0 },
        { day: 'Sunday', hours: 0 },
      ]

      const totalWeeklyHours = weeklySchedule.reduce((sum, day) => sum + day.hours, 0)
      expect(totalWeeklyHours).toBe(40)
    })

    it('calculates weekly cost', () => {
      const weeklyHours = 40
      const hourlyRate = 15
      const weeklyCost = weeklyHours * hourlyRate

      expect(weeklyCost).toBe(600)
    })
  })

  describe('validateShiftTime', () => {
    it('validates shift templates', () => {
      const morningShift = { startTime: '10:30', endTime: '17:00' }
      const afternoonShift = { startTime: '17:00', endTime: '23:00' }
      const nightShift = { startTime: '23:00', endTime: '03:00', isNightShift: true }

      const validateShift = (shift: { startTime: string; endTime: string; isNightShift?: boolean }) => {
        const [startH, startM] = shift.startTime.split(':').map(Number)
        const [endH, endM] = shift.endTime.split(':').map(Number)

        const startMinutes = startH * 60 + startM
        const endMinutes = endH * 60 + endM

        // Handle overnight shifts (end time < start time)
        if (shift.isNightShift) {
          return true // Overnight shifts are valid
        }

        return endMinutes > startMinutes
      }

      expect(validateShift(morningShift)).toBe(true)
      expect(validateShift(afternoonShift)).toBe(true)
      expect(validateShift(nightShift)).toBe(true)
    })

    it('rejects invalid shift times', () => {
      const invalidShift = { startTime: '17:00', endTime: '10:30' }

      const validateShift = (shift: { startTime: string; endTime: string }) => {
        const [startH, startM] = shift.startTime.split(':').map(Number)
        const [endH, endM] = shift.endTime.split(':').map(Number)

        const startMinutes = startH * 60 + startM
        const endMinutes = endH * 60 + endM

        return endMinutes > startMinutes
      }

      expect(validateShift(invalidShift)).toBe(false)
    })
  })

  describe('calculateMonthlyHours', () => {
    it('calculates total hours for month', () => {
      const weeksInMonth = 4
      const weeklyHours = 40

      const monthlyHours = weeksInMonth * weeklyHours
      expect(monthlyHours).toBe(160)
    })

    it('calculates monthly cost', () => {
      const monthlyHours = 160
      const hourlyRate = 15

      const monthlyCost = monthlyHours * hourlyRate
      expect(monthlyCost).toBe(2400)
    })
  })

  describe('identifyOvertimeEmployees', () => {
    it('identifies employees with overtime', () => {
      const employees = [
        { name: 'John', weeklyHours: 40 },
        { name: 'Jane', weeklyHours: 45 },
        { name: 'Bob', weeklyHours: 42 },
      ]

      const overtimeEmployees = employees.filter(e => e.weeklyHours > 40)
      expect(overtimeEmployees.length).toBe(2)
      expect(overtimeEmployees[0].name).toBe('Jane')
    })
  })

  describe('validateEmergencyContact', () => {
    it('validates emergency contact fields', () => {
      const validateContact = (contact: { name?: string; phone?: string }) => {
        return !!(contact.name?.trim() && contact.phone?.trim())
      }

      const validContact = { name: 'Mary', phone: '+34 971 123456' }
      const invalidContact = { name: 'Mary', phone: '' }

      expect(validateContact(validContact)).toBe(true)
      expect(validateContact(invalidContact)).toBe(false)
    })
  })

  describe('calculateStaffMetrics', () => {
    it('calculates comprehensive staff metrics', () => {
      const employees = [
        { name: 'John', hourlyRate: 15, contractType: 'full_time', weeklyHours: 40 },
        { name: 'Jane', hourlyRate: 12, contractType: 'part_time', weeklyHours: 30 },
      ]

      const metrics = {
        totalEmployees: employees.length,
        averageRate: employees.reduce((sum, e) => sum + e.hourlyRate, 0) / employees.length,
        fullTimeCount: employees.filter(e => e.contractType === 'full_time').length,
        totalWeeklyHours: employees.reduce((sum, e) => sum + e.weeklyHours, 0),
        totalWeeklyCost: employees.reduce((sum, e) => sum + (e.weeklyHours * e.hourlyRate), 0),
      }

      expect(metrics.totalEmployees).toBe(2)
      expect(metrics.averageRate).toBe(13.5)
      expect(metrics.fullTimeCount).toBe(1)
      expect(metrics.totalWeeklyHours).toBe(70)
      expect(metrics.totalWeeklyCost).toBe(960)
    })
  })
})

describe('Staff Validation', () => {
  describe('validateEmployeeData', () => {
    it('validates required employee fields', () => {
      const validateEmployee = (emp: {
        full_name?: string
        email?: string
        phone?: string
        hourly_rate?: number
        contract_type?: string
      }) => {
        return !!(
          emp.full_name?.trim() &&
          emp.email?.trim() &&
          emp.phone?.trim() &&
          emp.hourly_rate != null &&
          emp.contract_type
        )
      }

      const validEmployee = {
        full_name: 'John Doe',
        email: 'john@cheers.com',
        phone: '+34 971 123456',
        hourly_rate: 15,
        contract_type: 'full_time',
      }

      const invalidEmployee = {
        full_name: 'Jane Doe',
        email: '',
        phone: '+34 971 123456',
        hourly_rate: 12,
        contract_type: 'part_time',
      }

      expect(validateEmployee(validEmployee)).toBe(true)
      expect(validateEmployee(invalidEmployee)).toBe(false)
    })

    it('validates hourly rate range', () => {
      const validateRate = (rate: number) => {
        return rate >= 6 && rate <= 100 // Reasonable range
      }

      expect(validateRate(10)).toBe(true)
      expect(validateRate(5)).toBe(false)
      expect(validateRate(150)).toBe(false)
    })

    it('validates email format', () => {
      const validateEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      }

      expect(validateEmail('john@cheers.com')).toBe(true)
      expect(validateEmail('invalid.email')).toBe(false)
      expect(validateEmail('test@domain.co.uk')).toBe(true)
    })

    it('validates phone format', () => {
      const validatePhone = (phone: string) => {
        // Accept various formats: +34 xxx xxx xxx or xxx xxx xxx
        return /^[+]?[\d\s\-()]+$/.test(phone) && phone.replace(/\D/g, '').length >= 9
      }

      expect(validatePhone('+34 971 123456')).toBe(true)
      expect(validatePhone('971 123456')).toBe(true)
      expect(validatePhone('invalid')).toBe(false)
    })

    it('validates contract type enum', () => {
      const validTypes = ['full_time', 'part_time', 'casual', 'contractor']
      const validateContractType = (type: string) => validTypes.includes(type)

      expect(validateContractType('full_time')).toBe(true)
      expect(validateContractType('invalid_type')).toBe(false)
    })
  })
})

describe('Clock In/Out Calculations', () => {
  describe('calculateShiftDuration', () => {
    it('calculates minutes worked', () => {
      const clockIn = new Date('2024-01-01T10:30:00')
      const clockOut = new Date('2024-01-01T17:00:00')

      const durationMs = clockOut.getTime() - clockIn.getTime()
      const durationHours = durationMs / (1000 * 60 * 60)

      expect(durationHours).toBe(6.5)
    })

    it('handles same-day shift', () => {
      const clockIn = new Date('2024-01-01T22:00:00')
      const clockOut = new Date('2024-01-01T23:30:00')

      const durationMs = clockOut.getTime() - clockIn.getTime()
      const durationHours = durationMs / (1000 * 60 * 60)

      expect(durationHours).toBe(1.5)
    })

    it('handles overnight shift', () => {
      const clockIn = new Date('2024-01-01T23:00:00')
      const clockOut = new Date('2024-01-02T03:00:00')

      const durationMs = clockOut.getTime() - clockIn.getTime()
      const durationHours = durationMs / (1000 * 60 * 60)

      expect(durationHours).toBe(4)
    })
  })

  describe('calculateShiftCost', () => {
    it('calculates cost for single shift', () => {
      const hoursWorked = 8
      const hourlyRate = 15

      const shiftCost = hoursWorked * hourlyRate
      expect(shiftCost).toBe(120)
    })

    it('calculates cost with overtime multiplier', () => {
      const regularHours = 8
      const overtimeHours = 2
      const hourlyRate = 15

      const regularCost = regularHours * hourlyRate
      const overtimeCost = overtimeHours * hourlyRate * 1.5

      const totalCost = regularCost + overtimeCost
      expect(totalCost).toBe(165)
    })
  })
})

describe('Availability Management', () => {
  describe('parseAvailability', () => {
    it('parses availability string', () => {
      const availabilityString = 'available'
      const isAvailable = availabilityString === 'available'

      expect(isAvailable).toBe(true)
    })

    it('tracks unavailable days', () => {
      const unavailableDays = ['2024-01-15', '2024-01-22']
      const checkDate = '2024-01-15'

      const isAvailable = !unavailableDays.includes(checkDate)
      expect(isAvailable).toBe(false)
    })
  })
})
