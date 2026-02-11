import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { locales, defaultLocale, type Locale } from './config'

// Static imports for each locale to avoid webpack dynamic import issues
import enCommon from './messages/en/common.json'
import enAuth from './messages/en/auth.json'
import enDashboard from './messages/en/dashboard.json'
import enSettings from './messages/en/settings.json'
import enStaff from './messages/en/staff.json'
import enMenu from './messages/en/menu.json'
import enStock from './messages/en/stock.json'
import enSales from './messages/en/sales.json'
import enReservations from './messages/en/reservations.json'
import enEvents from './messages/en/events.json'
import enMarketing from './messages/en/marketing.json'
import enFinance from './messages/en/finance.json'
import enCustomers from './messages/en/customers.json'
import enKiosk from './messages/en/kiosk.json'
import enResources from './messages/en/resources.json'
import enBooking from './messages/en/booking.json'
import enAds from './messages/en/ads.json'
import enCoupons from './messages/en/coupons.json'

import nlCommon from './messages/nl/common.json'
import nlAuth from './messages/nl/auth.json'
import nlDashboard from './messages/nl/dashboard.json'
import nlSettings from './messages/nl/settings.json'
import nlStaff from './messages/nl/staff.json'
import nlMenu from './messages/nl/menu.json'
import nlStock from './messages/nl/stock.json'
import nlSales from './messages/nl/sales.json'
import nlReservations from './messages/nl/reservations.json'
import nlEvents from './messages/nl/events.json'
import nlMarketing from './messages/nl/marketing.json'
import nlFinance from './messages/nl/finance.json'
import nlCustomers from './messages/nl/customers.json'
import nlKiosk from './messages/nl/kiosk.json'
import nlResources from './messages/nl/resources.json'
import nlBooking from './messages/nl/booking.json'
import nlAds from './messages/nl/ads.json'
import nlCoupons from './messages/nl/coupons.json'

import esCommon from './messages/es/common.json'
import esAuth from './messages/es/auth.json'
import esDashboard from './messages/es/dashboard.json'
import esSettings from './messages/es/settings.json'
import esStaff from './messages/es/staff.json'
import esMenu from './messages/es/menu.json'
import esStock from './messages/es/stock.json'
import esSales from './messages/es/sales.json'
import esReservations from './messages/es/reservations.json'
import esEvents from './messages/es/events.json'
import esMarketing from './messages/es/marketing.json'
import esFinance from './messages/es/finance.json'
import esCustomers from './messages/es/customers.json'
import esKiosk from './messages/es/kiosk.json'
import esResources from './messages/es/resources.json'
import esBooking from './messages/es/booking.json'
import esAds from './messages/es/ads.json'
import esCoupons from './messages/es/coupons.json'

import deCommon from './messages/de/common.json'
import deAuth from './messages/de/auth.json'
import deDashboard from './messages/de/dashboard.json'
import deSettings from './messages/de/settings.json'
import deStaff from './messages/de/staff.json'
import deMenu from './messages/de/menu.json'
import deStock from './messages/de/stock.json'
import deSales from './messages/de/sales.json'
import deReservations from './messages/de/reservations.json'
import deEvents from './messages/de/events.json'
import deMarketing from './messages/de/marketing.json'
import deFinance from './messages/de/finance.json'
import deCustomers from './messages/de/customers.json'
import deKiosk from './messages/de/kiosk.json'
import deResources from './messages/de/resources.json'
import deBooking from './messages/de/booking.json'
import deAds from './messages/de/ads.json'
import deCoupons from './messages/de/coupons.json'

const messagesByLocale = {
  en: {
    common: enCommon,
    auth: enAuth,
    dashboard: enDashboard,
    settings: enSettings,
    staff: enStaff,
    menu: enMenu,
    stock: enStock,
    sales: enSales,
    reservations: enReservations,
    events: enEvents,
    marketing: enMarketing,
    finance: enFinance,
    customers: enCustomers,
    kiosk: enKiosk,
    resources: enResources,
    booking: enBooking,
    ads: enAds,
    coupons: enCoupons,
  },
  nl: {
    common: nlCommon,
    auth: nlAuth,
    dashboard: nlDashboard,
    settings: nlSettings,
    staff: nlStaff,
    menu: nlMenu,
    stock: nlStock,
    sales: nlSales,
    reservations: nlReservations,
    events: nlEvents,
    marketing: nlMarketing,
    finance: nlFinance,
    customers: nlCustomers,
    kiosk: nlKiosk,
    resources: nlResources,
    booking: nlBooking,
    ads: nlAds,
    coupons: nlCoupons,
  },
  es: {
    common: esCommon,
    auth: esAuth,
    dashboard: esDashboard,
    settings: esSettings,
    staff: esStaff,
    menu: esMenu,
    stock: esStock,
    sales: esSales,
    reservations: esReservations,
    events: esEvents,
    marketing: esMarketing,
    finance: esFinance,
    customers: esCustomers,
    kiosk: esKiosk,
    resources: esResources,
    booking: esBooking,
    ads: esAds,
    coupons: esCoupons,
  },
  de: {
    common: deCommon,
    auth: deAuth,
    dashboard: deDashboard,
    settings: deSettings,
    staff: deStaff,
    menu: deMenu,
    stock: deStock,
    sales: deSales,
    reservations: deReservations,
    events: deEvents,
    marketing: deMarketing,
    finance: deFinance,
    customers: deCustomers,
    kiosk: deKiosk,
    resources: deResources,
    booking: deBooking,
    ads: deAds,
    coupons: deCoupons,
  },
} as const

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  let locale = cookieStore.get('NEXT_LOCALE')?.value as Locale | undefined

  if (!locale || !locales.includes(locale)) {
    locale = defaultLocale
  }

  return {
    locale,
    messages: messagesByLocale[locale],
  }
})
