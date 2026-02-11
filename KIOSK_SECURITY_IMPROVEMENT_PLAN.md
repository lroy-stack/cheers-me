# Plan de Mejora de Seguridad: Kiosk Público

## Resumen Ejecutivo

El sistema actual de kiosk público presenta **12 vulnerabilidades críticas/altas** que permiten suplantación de identidad de empleados, falsificación de registros de asistencia, y exposición de datos sensibles. Este documento propone un plan de mejora en 3 fases basado en mejores prácticas de la industria.

**Vulnerabilidad más crítica identificada:** Cualquier persona puede hacer clock in/out de cualquier empleado sin verificación de propiedad.

---

## Estado Actual: Análisis de Vulnerabilidades

### Vulnerabilidades Críticas

| ID | Vulnerabilidad | Impacto | Archivo Afectado |
|----|---------------|---------|------------------|
| V1 | No hay gestión de sesión/token después de verificación PIN | Suplantación de identidad | `kiosk-client.tsx`, `verify-pin/route.ts` |
| V2 | No hay validación server-side de propiedad de empleado | Clock in/out fraudulento | `clock-in/route.ts`, `clock-out/route.ts`, `break/route.ts` |
| V3 | Empleado puede registrar asistencia de otros | Falsificación de nómina | Todos los endpoints de kiosk |

### Vulnerabilidades Altas

| ID | Vulnerabilidad | Impacto | Archivo Afectado |
|----|---------------|---------|------------------|
| V4 | Enumeración de ID para horas acumuladas | Extracción de datos de empleados | `accumulated-hours/route.ts` |
| V5 | Rate limiting en memoria (se resetea en cold start) | Fuerza bruta de PIN | `verify-pin/route.ts` |
| V6 | Sin registro de auditoría | Falta de accountability | Todos los endpoints |

### Vulnerabilidades Medias

| ID | Vulnerabilidad | Impacto |
|----|---------------|---------|
| V7 | PIN almacenado en texto plano | Compromiso de DB = todos los PINs |
| V8 | Temporizador de bloqueo automático es client-side | Manipulable via DevTools |
| V9 | Sin sanitización de input en encuestas | Posible XSS |

**Total: 9 vulnerabilidades críticas/altas que requieren acción inmediata**

---

## Benchmarking de Industria

### Mejores Prácticas en Kiosks de Empleados (2026)

Según [Wavetec](https://www.wavetec.com/blog/security-and-privacy-considerations-in-self-service-kiosks/) y [ScaleFusion](https://blog.scalefusion.com/strategies-to-secure-your-public-facing-kiosks/), los kiosks seguros implementan:

1. **Autenticación robusta:** PIN + biométrico + validación de dispositivo
2. **Gestión de sesión:** Timeouts automáticos, limpieza de caché entre usos
3. **Registro de sesión:** Accountability completo de todas las acciones
4. **Actualizaciones automáticas:** Parches de seguridad remotos

### Comparativa con Soluciones Comerciales

Según [ClockIt](https://clockit.io/biometric-time-clock/biometric-time-clock-for-cafes-and-restaurants/) y [Connecteam](https://connecteam.com/best-time-clock-kiosk-apps/), los sistemas líderes en restaurantes incluyen:

- **Biometría facial/huella** para prevenir "buddy punching"
- **Geofencing + IP whitelist** para limitar ubicación
- **MFA (PIN + facial recognition)** en tablets compartidos
- **Device binding:** El kiosk está vinculado a un dispositivo específico

**Fuentes:**
- [Security and Privacy Considerations in Self-Service Kiosks - Wavetec](https://www.wavetec.com/blog/security-and-privacy-considerations-in-self-service-kiosks/)
- [5 Kiosk Security Strategies - ScaleFusion](https://blog.scalefusion.com/strategies-to-secure-your-public-facing-kiosks/)
- [Biometric Time Clock for Cafes and Restaurants - ClockIt](https://clockit.io/biometric-time-clock/biometric-time-clock-for-cafes-and-restaurants/)
- [5 Best Time Clock Kiosk Apps - Connecteam](https://connecteam.com/best-time-clock-kiosk-apps/)

---

## Propuesta de Mejora: Arquitectura de 3 Capas

### Capa 1: Bloqueo Administrativo (Unlock Code)

**Tu propuesta original:** Antes de que empleados puedan usar el kiosk, un admin/owner debe desbloquearlo con un código.

**Implementación:**

```typescript
// Nueva tabla: kiosk_sessions
CREATE TABLE kiosk_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id VARCHAR(255) NOT NULL UNIQUE,
  unlocked_by UUID NOT NULL REFERENCES profiles(id),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  locked_reason VARCHAR(255),
  locked_at TIMESTAMPTZ,
  CONSTRAINT expires_after_unlock CHECK (expires_at > unlocked_at)
);

CREATE INDEX idx_kiosk_sessions_device ON kiosk_sessions(device_id, is_active);
CREATE INDEX idx_kiosk_sessions_expires ON kiosk_sessions(expires_at) WHERE is_active = TRUE;
```

**Flujo:**

1. **Estado inicial:** Kiosk bloqueado, muestra "Dispositivo bloqueado - Contacte a un administrador"
2. **Admin accede:** Ruta `/kiosk/unlock` con auth tradicional (email + password)
3. **Admin genera código:** Sistema genera código de 8 dígitos, válido por 12 horas
4. **Admin ingresa código en kiosk:** Kiosk envía código + device fingerprint
5. **Sistema valida:**
   - Código válido y no expirado
   - Rol de quien generó el código es admin/owner
   - Device ID matches
6. **Sistema crea sesión de kiosk:** Registro en `kiosk_sessions` con `expires_at` = +12 horas
7. **Kiosk desbloqueado:** Empleados pueden usarlo hasta que expire o admin lo bloquee manualmente

**Endpoints nuevos:**

```typescript
POST /api/admin/kiosk/generate-unlock-code
  → Auth: Requiere admin/owner
  → Body: { device_id: string }
  → Response: { code: "12345678", expires_at: "2026-02-11T21:00:00Z" }

POST /api/public/kiosk/unlock
  → Body: { code: string, device_id: string }
  → Response: { session_token: "JWT...", expires_at: "..." }

POST /api/admin/kiosk/lock
  → Auth: Requiere admin/owner
  → Body: { device_id: string, reason?: string }
  → Response: { success: true }

GET /api/admin/kiosk/sessions
  → Auth: Requiere admin/owner
  → Response: [ { device_id, unlocked_by, unlocked_at, is_active, ... } ]
```

**Ventajas:**
✅ Control total sobre qué dispositivos pueden acceder
✅ Auditoría de quién desbloqueó y cuándo
✅ Puede bloquear remotamente si hay sospecha de uso indebido
✅ Expira automáticamente (sin intervención humana)

**Device Fingerprinting:**
```typescript
// En cliente (kiosk-client.tsx)
import FingerprintJS from '@fingerprintjs/fingerprintjs'

async function getDeviceFingerprint(): Promise<string> {
  const fp = await FingerprintJS.load()
  const result = await fp.get()
  return result.visitorId // ← Único por dispositivo
}
```

---

### Capa 2: Autenticación de Empleado Mejorada

**Reemplazo de sistema actual de PIN:**

#### Opción A: PIN Hasheado + Session Token (Mínimo viable)

```typescript
// Migración: Hash existing PINs
UPDATE employees
SET kiosk_pin_hash = crypt(kiosk_pin, gen_salt('bf', 10))
WHERE kiosk_pin IS NOT NULL;

ALTER TABLE employees
  DROP COLUMN kiosk_pin,
  ADD COLUMN kiosk_pin_hash VARCHAR(60);

// API: verify-pin/route.ts
const employee = await supabase
  .from('employees')
  .select('id, profile_id, kiosk_pin_hash, role')
  .eq('kiosk_pin_hash', crypto.scrypt(pin, salt, 60))
  .single()

if (!employee) {
  await logFailedAttempt(pin, ip)
  return error('PIN inválido')
}

// Crear JWT firmado con employee_id
const sessionToken = jwt.sign(
  { employee_id: employee.id, role: employee.role },
  process.env.KIOSK_JWT_SECRET,
  { expiresIn: '10m', issuer: 'kiosk', subject: employee.id }
)

// Guardar en DB con TTL
await supabase.from('kiosk_employee_sessions').insert({
  employee_id: employee.id,
  device_id: req.body.device_id,
  session_token_hash: crypto.createHash('sha256').update(sessionToken).digest('hex'),
  ip_address: getIP(req),
  expires_at: new Date(Date.now() + 10 * 60 * 1000)
})

return { sessionToken, employee: { id, name, role, avatar } }
```

**Validación en endpoints posteriores:**
```typescript
// Middleware en clock-in/route.ts
async function validateKioskSession(req: NextRequest): Promise<Employee | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.substring(7)

  // Verificar JWT
  let payload
  try {
    payload = jwt.verify(token, process.env.KIOSK_JWT_SECRET)
  } catch {
    return null
  }

  // Verificar que no está expirado en DB
  const { data: session } = await supabase
    .from('kiosk_employee_sessions')
    .select('employee_id, expires_at')
    .eq('session_token_hash', crypto.createHash('sha256').update(token).digest('hex'))
    .single()

  if (!session || new Date(session.expires_at) < new Date()) {
    return null
  }

  return { id: payload.employee_id, role: payload.role }
}

// En clock-in/route.ts
export async function POST(req: NextRequest) {
  const employee = await validateKioskSession(req)
  if (!employee) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
  }

  const { employee_id } = await req.json()

  // ¡CRÍTICO! Validar que employee_id del body coincide con el del token
  if (employee_id !== employee.id) {
    await auditLog('UNAUTHORIZED_CLOCK_IN_ATTEMPT', {
      token_employee: employee.id,
      requested_employee: employee_id,
      ip: getIP(req)
    })
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  // Proceder con clock-in...
}
```

**Timeout automático server-side:**
```typescript
// Cron job: Limpiar sesiones expiradas cada 5 minutos
// En /api/cron/cleanup-kiosk-sessions (protegido con Vercel Cron token)
await supabase
  .from('kiosk_employee_sessions')
  .delete()
  .lt('expires_at', new Date().toISOString())
```

#### Opción B: PIN + Biométrico (Óptimo - Requiere hardware)

Si tienes acceso a iPad/tablet con cámara o lector de huellas:

```typescript
// 1. Capturar foto facial en verify-pin
// 2. Enviar a API de reconocimiento facial (ej: AWS Rekognition, Azure Face API)
// 3. Comparar con foto de perfil del empleado
// 4. Solo si PIN + facial match → Crear sesión

POST /api/public/kiosk/verify-pin-biometric
  Body: {
    pin: string,
    device_id: string,
    face_image_base64: string  // ← Foto capturada
  }

  → Validar PIN
  → Validar que face_image coincide con employee.avatar usando AWS Rekognition
  → Si ambos OK → Crear sesión
```

**Ventajas:**
✅ Previene "buddy punching" (empleado A registra a empleado B)
✅ Estándar en industria de restaurantes (ClockIt, ADP Time Kiosk)
✅ Mayor confianza en identidad

**Desventajas:**
⚠️ Requiere hardware con cámara de calidad
⚠️ Costo adicional de API de reconocimiento facial (~$0.001/foto)
⚠️ Consideraciones de privacidad (GDPR, CCPA)

---

### Capa 3: Protecciones de Infraestructura

#### A. IP Whitelisting

```typescript
// vercel.json
{
  "headers": [
    {
      "source": "/api/public/kiosk/:path*",
      "headers": [
        {
          "key": "X-Kiosk-Allowed-IPs",
          "value": "192.168.1.100,192.168.1.101" // ← IPs del restaurante
        }
      ]
    }
  ]
}

// Middleware en cada endpoint
function validateKioskIP(req: NextRequest): boolean {
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
  const allowedIPs = process.env.KIOSK_ALLOWED_IPS?.split(',') || []

  if (!allowedIPs.includes(clientIP || '')) {
    console.warn(`Blocked kiosk access from unauthorized IP: ${clientIP}`)
    return false
  }
  return true
}
```

#### B. Rate Limiting Persistente

**ACTUALIZACIÓN: Vercel KV fue deprecado en Dic 2024**, migrado a Upstash. Ahora tienes 3 opciones según tu presupuesto:

##### **Opción 1: Upstash Redis (GRATIS hasta 10k req/día)**

```bash
# Instalar Upstash integration desde Vercel Dashboard
# O usar Upstash Redis directamente (free tier: 10k comandos/día)
pnpm add @upstash/redis @upstash/ratelimit
```

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const kioskRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'), // 3 intentos por hora
  prefix: 'kiosk_pin_verify',
})

// En verify-pin/route.ts
const { success, remaining, reset } = await kioskRateLimiter.limit(
  `pin:${pin}:ip:${getIP(req)}`
)

if (!success) {
  return NextResponse.json(
    { error: `Demasiados intentos. Intente nuevamente en ${Math.ceil((reset - Date.now()) / 60000)} minutos` },
    { status: 429 }
  )
}
```

**Ventajas:**
- ✅ **GRATIS** hasta 10k requests/día (más que suficiente para un restaurante)
- ✅ Persistente entre cold starts
- ✅ Distribuido entre edge functions de Vercel
- ✅ Límite más estricto (3 por hora vs 5 por 15 min)

**Fuentes:**
- [Redis on Vercel - Vercel Docs](https://vercel.com/docs/storage/vercel-kv/usage-and-pricing)
- [Rate Limiting with Vercel Edge - Upstash Blog](https://upstash.com/blog/edge-rate-limiting)

##### **Opción 2: Next.js Edge Middleware + DB (GRATIS, sin Redis)**

Si prefieres no depender de servicios externos:

```typescript
// middleware.ts (Next.js Edge Runtime)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hora
const MAX_ATTEMPTS = 3

export async function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api/public/kiosk/verify-pin')) {
    return NextResponse.next()
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const supabase = createClient(request)

  // Limpiar intentos viejos
  await supabase
    .from('kiosk_rate_limits')
    .delete()
    .lt('created_at', new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString())

  // Contar intentos en ventana
  const { count } = await supabase
    .from('kiosk_rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .gte('created_at', new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString())

  if ((count || 0) >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Intente en 1 hora.' },
      { status: 429 }
    )
  }

  return NextResponse.next()
}

// Nueva tabla: kiosk_rate_limits
CREATE TABLE kiosk_rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address VARCHAR(45) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_kiosk_rate_limits_ip_time ON kiosk_rate_limits(ip_address, created_at);
```

**Ventajas:**
- ✅ **100% GRATIS** (usa tu DB existente)
- ✅ Sin dependencias externas
- ✅ Corre en Vercel Edge (bajo latency)

**Desventajas:**
- ⚠️ Más queries a Supabase (pero aún dentro de free tier)
- ⚠️ No tan eficiente como Redis dedicado

**Fuentes:**
- [Next.js Middleware: Rate Limiting - Medium](https://medium.com/@maazkhanmk1434/next-js-middleware-rate-limiting-ip-blocking-and-auth-checks-b13ec7f54e40)
- [Implementing Rate Limiting without External Packages - Medium](https://medium.com/@abrar.adam.09/implementing-rate-limiting-in-next-js-api-routes-without-external-packages-7195ca4ef768)

##### **Opción 3: Cloudflare Turnstile + WAF (GRATIS, mejor opción)**

**Tu intuición es correcta**: Cloudflare es mejor para web apps. [Cloudflare Turnstile](https://www.cloudflare.com/application-services/products/turnstile/) es **gratis hasta 1M requests/mes** y reemplaza CAPTCHA completamente.

```typescript
// 1. Configurar Cloudflare Turnstile en dashboard (gratis)
// 2. Agregar widget en /kiosk antes de PIN input

// components/kiosk/turnstile-widget.tsx
'use client'

export function TurnstileWidget({ onVerify }: { onVerify: (token: string) => void }) {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    document.body.appendChild(script)
  }, [])

  return (
    <div
      className="cf-turnstile"
      data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
      data-callback="onTurnstileVerify"
    />
  )
}

// En verify-pin/route.ts
async function validateTurnstile(token: string, ip: string): Promise<boolean> {
  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: ip,
      }),
    }
  )
  const data = await response.json()
  return data.success
}

export async function POST(req: NextRequest) {
  const { pin, turnstile_token } = await req.json()

  // Validar Turnstile ANTES de verificar PIN
  const isHuman = await validateTurnstile(turnstile_token, getIP(req))
  if (!isHuman) {
    return NextResponse.json(
      { error: 'Verificación de seguridad falló. Recargue la página.' },
      { status: 403 }
    )
  }

  // Proceder con verificación de PIN...
}
```

**Ventajas sobre Redis/DB:**
- ✅ **GRATIS hasta 1M requests/mes** (según [Cloudflare Turnstile Plans](https://developers.cloudflare.com/turnstile/plans/))
- ✅ Previene bots completamente (no solo rate limiting)
- ✅ Sin puzzles molestos (invisible para usuarios reales)
- ✅ No harvests data for ads (privacy-first)
- ✅ Se integra con Cloudflare WAF si proxy tu dominio por CF

**Cómo usarlo:**
1. Poner tu dominio detrás de Cloudflare (gratis)
2. Activar Turnstile widget en `/kiosk` (gratis hasta 1M/mes)
3. (Opcional) Configurar [WAF Rate Limiting Rules](https://developers.cloudflare.com/waf/rate-limiting-rules/) para bloquear IPs sospechosas

**Fuentes:**
- [Cloudflare Turnstile - Free CAPTCHA Replacement](https://blog.cloudflare.com/turnstile-ga/)
- [Cloudflare Turnstile Plans](https://developers.cloudflare.com/turnstile/plans/)

---

### **🎯 Recomendación para tu caso:**

**Opción 3 (Cloudflare Turnstile)** es la mejor porque:
1. Ya tienes una web app pública (ideal para Turnstile)
2. Previene bots + rate limiting en uno
3. 100% gratis hasta 1M requests (un restaurante no llega ni cerca)
4. Sin mantener Redis ni queries extra a DB

Si no quieres proxy por Cloudflare, usa **Opción 2 (Edge Middleware + DB)** — completamente gratis con tu setup actual.

#### C. Auditoría Completa

```typescript
// Nueva tabla: kiosk_audit_log
CREATE TABLE kiosk_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type VARCHAR(50) NOT NULL, -- 'PIN_VERIFY_SUCCESS', 'CLOCK_IN', 'UNAUTHORIZED_ATTEMPT', etc.
  employee_id UUID REFERENCES employees(id),
  device_id VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  metadata JSONB, -- Detalles adicionales
  CONSTRAINT valid_event_type CHECK (event_type IN ('PIN_VERIFY_SUCCESS', 'PIN_VERIFY_FAILED', 'CLOCK_IN', 'CLOCK_OUT', 'BREAK_START', 'BREAK_END', 'SURVEY_SUBMIT', 'UNAUTHORIZED_ATTEMPT', 'SESSION_EXPIRED', 'ADMIN_UNLOCK', 'ADMIN_LOCK'))
);

CREATE INDEX idx_kiosk_audit_timestamp ON kiosk_audit_log(timestamp DESC);
CREATE INDEX idx_kiosk_audit_employee ON kiosk_audit_log(employee_id, timestamp DESC);
CREATE INDEX idx_kiosk_audit_event_type ON kiosk_audit_log(event_type, timestamp DESC);

// Helper function
async function auditKioskEvent(
  eventType: KioskAuditEventType,
  employeeId: string | null,
  deviceId: string,
  req: NextRequest,
  success: boolean,
  metadata?: Record<string, unknown>
) {
  await supabase.from('kiosk_audit_log').insert({
    event_type: eventType,
    employee_id: employeeId,
    device_id: deviceId,
    ip_address: getIP(req),
    user_agent: req.headers.get('user-agent'),
    success,
    metadata,
  })
}

// Uso en verify-pin/route.ts
if (!employee) {
  await auditKioskEvent('PIN_VERIFY_FAILED', null, device_id, req, false, { pin_length: pin.length })
  return error()
}

await auditKioskEvent('PIN_VERIFY_SUCCESS', employee.id, device_id, req, true, { role: employee.role })
```

**Dashboard de auditoría para admin:**
```typescript
GET /api/admin/kiosk/audit-log
  → Query params: { employee_id?, event_type?, start_date?, end_date?, limit?, offset? }
  → Response: [ { id, timestamp, event_type, employee_name, device_id, ip, success, metadata } ]
```

#### D. Geofencing (Opcional)

Si el dispositivo soporta geolocalización:

```typescript
// En cliente
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(position => {
    const { latitude, longitude } = position.coords
    // Enviar con cada request
  })
}

// En servidor
const RESTAURANT_LAT = 39.5425 // El Arenal, Mallorca
const RESTAURANT_LON = 2.7357
const MAX_DISTANCE_KM = 0.5 // 500 metros

function validateGeofence(lat: number, lon: number): boolean {
  const distance = calculateHaversineDistance(
    RESTAURANT_LAT, RESTAURANT_LON, lat, lon
  )
  return distance <= MAX_DISTANCE_KM
}
```

---

## Plan de Implementación por Fases

### **FASE 1: Mitigación Urgente (1 semana)**

**Objetivo:** Cerrar vulnerabilidades críticas V1, V2, V3

#### Tareas:

1. **Implementar session tokens JWT**
   - [ ] Crear tabla `kiosk_employee_sessions`
   - [ ] Modificar `/api/public/kiosk/verify-pin` para generar JWT
   - [ ] Crear middleware `validateKioskSession()`
   - [ ] Aplicar middleware a todos los endpoints (clock-in, clock-out, break, survey)
   - [ ] Testing: Intentar clock-in con `employee_id` diferente al del token → Debe fallar

2. **Validación de propiedad de empleado**
   - [ ] En cada endpoint, verificar `token.employee_id === body.employee_id`
   - [ ] Logging de intentos no autorizados

3. **Rate limiting persistente**
   - [ ] Configurar Upstash Redis (free tier: 10k requests/día)
   - [ ] Implementar `@upstash/ratelimit` en verify-pin
   - [ ] Cambiar límite a 3 intentos por hora por PIN

4. **Auditoría básica**
   - [ ] Crear tabla `kiosk_audit_log`
   - [ ] Agregar logging a todos los endpoints
   - [ ] Dashboard básico en `/settings/kiosk/audit`

**Entregables:**
- ✅ Endpoints de kiosk requieren session token válido
- ✅ Empleado solo puede registrar su propia asistencia
- ✅ Rate limiting persistente y más estricto
- ✅ Registro de auditoría de todas las acciones

**Tiempo estimado:** 5-7 días (1 desarrollador)

---

### **FASE 2: Unlock Administrativo (2 semanas)**

**Objetivo:** Implementar tu propuesta de código de desbloqueo

#### Tareas:

1. **Backend de unlock**
   - [ ] Crear tabla `kiosk_sessions`
   - [ ] Implementar `POST /api/admin/kiosk/generate-unlock-code`
   - [ ] Implementar `POST /api/public/kiosk/unlock`
   - [ ] Implementar `POST /api/admin/kiosk/lock`
   - [ ] Implementar `GET /api/admin/kiosk/sessions`

2. **Device fingerprinting**
   - [ ] Integrar `@fingerprintjs/fingerprintjs` en cliente
   - [ ] Enviar `device_id` en todos los requests
   - [ ] Validar que `device_id` tiene sesión activa antes de permitir acceso

3. **Frontend de unlock**
   - [ ] Crear página `/kiosk/unlock` (requiere auth admin)
   - [ ] Crear modal "Dispositivo bloqueado" en `/kiosk` cuando no hay sesión
   - [ ] Mostrar código generado + instrucciones en dashboard admin
   - [ ] Input de código de 8 dígitos en kiosk

4. **Expiración automática**
   - [ ] Cron job cada hora: marcar sesiones expiradas como `is_active = false`
   - [ ] Cliente verifica cada 5 min si su sesión sigue activa (polling)
   - [ ] Mostrar modal "Sesión expirada" cuando detecta expiración

5. **Dashboard de sesiones**
   - [ ] Página `/settings/kiosk/sessions` en admin panel
   - [ ] Lista de dispositivos desbloqueados, cuándo, por quién
   - [ ] Botón "Bloquear" para forzar cierre

**Entregables:**
- ✅ Kiosk requiere unlock code de admin antes de permitir uso
- ✅ Sesiones expiran automáticamente después de 12 horas
- ✅ Admin puede ver qué dispositivos están activos
- ✅ Admin puede bloquear remotamente

**Tiempo estimado:** 10-14 días (1 desarrollador)

---

### **FASE 3: Mejoras Avanzadas (3-4 semanas)**

**Objetivo:** IP whitelist, hashing de PIN, mejoras de UX

#### Tareas:

1. **IP Whitelisting**
   - [ ] Configurar variable de entorno `KIOSK_ALLOWED_IPS`
   - [ ] Middleware `validateKioskIP()` en todos los endpoints
   - [ ] Dashboard para admin: gestionar IPs permitidas
   - [ ] Testing desde IP no autorizada → Debe fallar

2. **Hashing de PINs**
   - [ ] Migración: hash todos los PINs existentes con bcrypt
   - [ ] Modificar `verify-pin` para usar bcrypt.compare()
   - [ ] Eliminar columna `kiosk_pin`, mantener solo `kiosk_pin_hash`

3. **Mejoras de UX**
   - [ ] Timeout de sesión server-side (forzar re-PIN después de 10 min)
   - [ ] Animación de "bloqueado" cuando se alcanza rate limit
   - [ ] Notificación push a admin cuando hay intentos sospechosos
   - [ ] Pantalla de privacidad (screen dimming) cuando no hay actividad

4. **Biométrico (Opcional)**
   - [ ] Solo si decides invertir en hardware con cámara
   - [ ] Integrar AWS Rekognition o Azure Face API
   - [ ] Capturar foto facial en verify-pin
   - [ ] Comparar con `employees.avatar_url`

**Entregables:**
- ✅ Solo IPs del restaurante pueden acceder al kiosk
- ✅ PINs hasheados en DB (más seguro ante breach)
- ✅ Sesión expira automáticamente después de inactividad
- ✅ (Opcional) Biométrico facial

**Tiempo estimado:** 15-20 días (1 desarrollador)

---

## Decisiones Arquitectónicas

### ¿Cómo implementar el unlock code?

**Opción A: Código temporal generado por admin (RECOMENDADO)**

- Admin genera código de 8 dígitos válido por 12 horas
- Código se vincula a un `device_id` específico
- Empleado ingresa código en kiosk, sistema crea sesión de kiosk
- Sesión expira automáticamente o admin puede bloquear

**Ventajas:**
✅ Admin tiene control total sobre qué dispositivos están activos
✅ Puede bloquear remotamente si sospecha de uso indebido
✅ Auditoría completa de quién desbloqueó y cuándo

**Opción B: Código fijo por dispositivo**

- Cada dispositivo tiene un código fijo de 8 dígitos
- Admin configura el código en `/settings/kiosk/devices`
- Empleado ingresa código cada vez que usa el kiosk

**Desventajas:**
❌ Si código se filtra, está comprometido hasta que admin lo cambie
❌ No hay expiración automática
❌ Menos flexible

**Recomendación:** **Opción A** - Más seguro y flexible

### ¿Cómo manejar múltiples kiosks?

Si tienes más de un dispositivo (ej: 1 en cocina, 1 en barra):

```typescript
// Cada kiosk tiene su propio device_id único (generado por fingerprint)
// Admin puede ver lista de dispositivos en dashboard:

GET /api/admin/kiosk/sessions
Response: [
  {
    device_id: "fp_abc123",
    device_name: "iPad Cocina",  // ← Admin puede poner nombre amigable
    unlocked_by: "admin@cheers.com",
    unlocked_at: "2026-02-11T09:00:00Z",
    expires_at: "2026-02-11T21:00:00Z",
    is_active: true
  },
  {
    device_id: "fp_def456",
    device_name: "iPad Barra",
    unlocked_by: "owner@cheers.com",
    unlocked_at: "2026-02-11T08:30:00Z",
    expires_at: "2026-02-11T20:30:00Z",
    is_active: true
  }
]
```

### ¿Qué pasa si el kiosk pierde conexión?

**Problema:** Si WiFi cae, empleados no pueden hacer clock in/out.

**Soluciones:**

1. **Modo offline con sincronización diferida (Complex)**
   - Kiosk guarda clock-ins en LocalStorage
   - Cuando recupera conexión, sube todo al servidor
   - Requiere lógica de resolución de conflictos

2. **Permitir clock manual en dashboard (Simple)**
   - Si kiosk no funciona, admin puede registrar manualmente en `/staff/clock`
   - Más simple, menos automático

**Recomendación:** **Opción 2** por ahora. Si la conexión es crítica, evaluar modo offline en el futuro.

---

## Estimación de Costos

### Tiempo de Desarrollo

| Fase | Duración | Costo (@€50/hora) |
|------|----------|-------------------|
| Fase 1: Mitigación urgente | 5-7 días | €2,000 - €2,800 |
| Fase 2: Unlock administrativo | 10-14 días | €4,000 - €5,600 |
| Fase 3: Mejoras avanzadas | 15-20 días | €6,000 - €8,000 |
| **TOTAL** | **30-41 días** | **€12,000 - €16,400** |

### Costos de Infraestructura

| Servicio | Uso | Costo mensual |
|----------|-----|---------------|
| **Opción 1:** Upstash Redis (rate limiting) | Free tier: 10k commands/día | **€0** (si < 10k req/día) |
| **Opción 2:** Edge Middleware + Supabase DB | Queries a DB existente | **€0** (dentro de free tier) |
| **Opción 3:** Cloudflare Turnstile | Free tier: 1M requests/mes | **€0** (hasta 1M/mes) |
| AWS Rekognition (facial recognition) | 1000 empleados × 10 verif/día × €0.001 | €10/mes (opcional) |
| Device fingerprinting (FingerprintJS) | Hasta 100k requests/mes | €0 (open source) |
| **TOTAL (sin biométrico)** | | **€0/mes** ✅ |
| **TOTAL (con biométrico)** | | **€10/mes** |

**✅ Actualización importante:** Todas las opciones de rate limiting son GRATIS con Vercel/Cloudflare free tiers.

---

## Checklist de Implementación

### Pre-requisitos

- [ ] Decidir si implementar biométrico (requiere cámara en kiosk)
- [ ] Configurar Upstash Redis (free tier suficiente)
- [ ] Generar `KIOSK_JWT_SECRET` (256-bit random string)
- [ ] Definir IPs permitidas del restaurante
- [ ] Backup de DB antes de migrar PINs a hash

### Fase 1 (Crítico - 1 semana)

- [ ] Migración: Crear tabla `kiosk_employee_sessions`
- [ ] Migración: Crear tabla `kiosk_audit_log`
- [ ] Backend: Implementar JWT en verify-pin
- [ ] Backend: Middleware `validateKioskSession()` en todos los endpoints
- [ ] Backend: Validar ownership (`token.employee_id === body.employee_id`)
- [ ] Backend: Rate limiting con Upstash Redis
- [ ] Backend: Logging de auditoría en todos los endpoints
- [ ] Testing: Unit tests para validateKioskSession
- [ ] Testing: E2E test: intentar clock-in con employee_id diferente → Debe fallar
- [ ] Testing: E2E test: rate limiting → Bloquear después de 3 intentos fallidos
- [ ] Deploy a production

### Fase 2 (Unlock - 2 semanas)

- [ ] Migración: Crear tabla `kiosk_sessions`
- [ ] Backend: `POST /api/admin/kiosk/generate-unlock-code`
- [ ] Backend: `POST /api/public/kiosk/unlock`
- [ ] Backend: `POST /api/admin/kiosk/lock`
- [ ] Backend: `GET /api/admin/kiosk/sessions`
- [ ] Frontend: Integrar `@fingerprintjs/fingerprintjs`
- [ ] Frontend: Página `/kiosk/unlock` (admin only)
- [ ] Frontend: Modal "Dispositivo bloqueado" en `/kiosk`
- [ ] Frontend: Input de unlock code en kiosk
- [ ] Frontend: Dashboard `/settings/kiosk/sessions` para admin
- [ ] Backend: Cron job para expirar sesiones (Vercel Cron)
- [ ] Testing: E2E test: unlock flow completo
- [ ] Testing: E2E test: sesión expira después de 12h
- [ ] Testing: E2E test: admin puede bloquear remotamente
- [ ] Deploy a production

### Fase 3 (Avanzado - 3-4 semanas)

- [ ] Backend: Middleware `validateKioskIP()` con whitelist
- [ ] Frontend: Dashboard para gestionar IPs permitidas
- [ ] Migración: Hash todos los PINs existentes (bcrypt factor 10)
- [ ] Backend: Actualizar verify-pin para usar bcrypt.compare()
- [ ] Backend: Timeout de sesión (10 min de inactividad)
- [ ] Frontend: Polling para verificar sesión cada 5 min
- [ ] Frontend: Modal "Sesión expirada" cuando detecta expiración
- [ ] (Opcional) Backend: Integrar AWS Rekognition para facial recognition
- [ ] (Opcional) Frontend: Captura de foto facial en verify-pin
- [ ] Testing: E2E test: IP whitelist bloquea IPs no autorizadas
- [ ] Testing: E2E test: sesión expira después de 10 min de inactividad
- [ ] (Opcional) Testing: E2E test: facial recognition funciona
- [ ] Deploy a production

---

## Métricas de Éxito

### KPIs de Seguridad

| Métrica | Objetivo | Cómo medir |
|---------|----------|------------|
| Intentos no autorizados de clock-in | 0 por mes | `SELECT COUNT(*) FROM kiosk_audit_log WHERE event_type = 'UNAUTHORIZED_ATTEMPT'` |
| PINs comprometidos | 0 | Monitoreo de intentos de fuerza bruta |
| Sesiones sin expirar correctamente | < 1% | `SELECT COUNT(*) FROM kiosk_sessions WHERE expires_at < NOW() AND is_active = TRUE` |
| Tiempo promedio de respuesta de verify-pin | < 500ms | Métricas de Vercel |
| Intentos de acceso desde IPs no autorizadas | 0 | Logs de middleware `validateKioskIP()` |

### KPIs de Usabilidad

| Métrica | Objetivo | Cómo medir |
|---------|----------|------------|
| Tiempo promedio de clock-in | < 10 segundos | `SELECT AVG(duration) FROM kiosk_audit_log WHERE event_type = 'CLOCK_IN'` |
| % de empleados que reportan problemas con kiosk | < 5% | Encuesta mensual |
| Uptime del kiosk | > 99% | Monitoreo de disponibilidad |

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Empleados olvidan PINs frecuentemente | Alta | Medio | Admin puede resetear PIN en dashboard |
| Kiosk pierde conexión WiFi | Media | Alto | Permitir clock manual en dashboard como fallback |
| Device fingerprint cambia después de actualización | Baja | Alto | Admin puede regenerar unlock code para nuevo device_id |
| Rate limiting bloquea empleado legítimo | Media | Medio | Admin puede resetear rate limit en dashboard |
| Costo de AWS Rekognition excede presupuesto | Baja | Bajo | Monitorear uso mensual, desactivar si excede €20/mes |

---

## Siguientes Pasos

1. **Revisión del plan:** Leer este documento y decidir qué fases implementar
2. **Priorización:** ¿Fase 1 es urgente? ¿Fase 2 es crítica para tu operación?
3. **Decisión de biométrico:** ¿Vale la pena el costo adicional de hardware + API?
4. **Asignación de recursos:** ¿Quién implementará? ¿Cuándo?
5. **Kickoff de Fase 1:** Si decides proceder, empezamos con mitigación urgente

---

## Referencias y Fuentes

- [Security and Privacy Considerations in Self-Service Kiosks - Wavetec](https://www.wavetec.com/blog/security-and-privacy-considerations-in-self-service-kiosks/)
- [5 Kiosk Security Strategies That Businesses Should Know - ScaleFusion](https://blog.scalefusion.com/strategies-to-secure-your-public-facing-kiosks/)
- [4 Must-Have Security Features for Your Kiosk - KIOSK Information Systems](https://kiosk.com/must-have-security-features/)
- [Biometric Time Clock for Cafes and Restaurants - ClockIt](https://clockit.io/biometric-time-clock/biometric-time-clock-for-cafes-and-restaurants/)
- [5 Best Time Clock Kiosk Apps of 2026 - Connecteam](https://connecteam.com/best-time-clock-kiosk-apps/)
- [Kiosk Security with MDM: How to Protect Public Devices - Trio](https://www.trio.so/blog/kiosk-security)

---

**Documento creado:** 2026-02-11
**Última actualización:** 2026-02-11
**Estado:** Propuesta inicial - Pendiente de revisión
