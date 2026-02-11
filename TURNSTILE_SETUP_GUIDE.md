# Cloudflare Turnstile Setup Guide

## 📋 Resumen

Este documento te guiará paso a paso para configurar Cloudflare Turnstile y desplegar la protección del kiosk a producción.

---

## 🔐 Paso 1: Crear Cuenta y Sitio en Cloudflare Turnstile

### 1.1. Acceder a Cloudflare

1. Ve a: **https://dash.cloudflare.com/**
2. Si no tienes cuenta, regístrate (es gratis para Turnstile)
3. Inicia sesión

### 1.2. Crear un Sitio de Turnstile

1. En el menú lateral, busca **"Turnstile"** (puede estar en "Security" o búscalo en el buscador)
2. Click en **"Add Site"**
3. Completa el formulario:
   - **Site name**: `GrandCafe Cheers Kiosk`
   - **Domain**: `grandcafe-cheers-app.vercel.app` (o tu dominio personalizado si lo tienes)
   - **Widget Mode**: Selecciona **"Managed"** ⭐ (recomendado - adaptativo según riesgo)
   - **Pre-Clearance**: Deja en "None"

4. Click en **"Create"**

### 1.3. Copiar las Keys

Después de crear el sitio, verás:
- **Site Key** (pública) - Empieza con `0x...` o similar
- **Secret Key** (privada) - Guárdala de forma segura

**IMPORTANTE**: Copia ambas keys en un lugar seguro temporalmente.

---

## 🔑 Paso 2: Variables de Entorno Generadas

Ya tienes el JWT secret generado:

```
KIOSK_SESSION_SECRET=UfHmpZimzZqFcf1NwIjAUEpBWPVXOH6k98KFgfdmZB4=
```

Ahora necesitas las de Cloudflare:

```
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<Tu Site Key copiada de Cloudflare>
TURNSTILE_SECRET_KEY=<Tu Secret Key copiada de Cloudflare>
```

---

## ☁️ Paso 3: Configurar en Vercel

### Opción A: Via CLI (Recomendado)

Ejecuta estos comandos en tu terminal desde la raíz del proyecto:

```bash
# 1. Site Key (público) - Production
vercel env add NEXT_PUBLIC_TURNSTILE_SITE_KEY production
# Pega tu Site Key cuando te lo pida

# 2. Secret Key (privado) - Production
vercel env add TURNSTILE_SECRET_KEY production
# Pega tu Secret Key cuando te lo pida

# 3. JWT Secret - Production
vercel env add KIOSK_SESSION_SECRET production
# Pega: UfHmpZimzZqFcf1NwIjAUEpBWPVXOH6k98KFgfdmZB4=

# REPETIR PARA PREVIEW
vercel env add NEXT_PUBLIC_TURNSTILE_SITE_KEY preview
vercel env add TURNSTILE_SECRET_KEY preview
vercel env add KIOSK_SESSION_SECRET preview
```

### Opción B: Via Dashboard de Vercel

1. Ve a: https://vercel.com/
2. Selecciona tu proyecto: `grandcafe-cheers-app`
3. Ve a **Settings** → **Environment Variables**
4. Añade las 3 variables:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` → Production + Preview
   - `TURNSTILE_SECRET_KEY` → Production + Preview
   - `KIOSK_SESSION_SECRET` → Production + Preview

---

## 🗄️ Paso 4: Migrar Base de Datos

Antes de desplegar, necesitas ejecutar las migraciones:

```bash
pnpm run db:migrate
```

Esto creará:
- ✅ Tabla `kiosk_rate_limits` (rate limiting persistente)
- ✅ Tabla `kiosk_security_events` (logging de eventos)
- ✅ Vista `recent_kiosk_security_events` (dashboard)

Verifica en Supabase Dashboard que las tablas se crearon correctamente:
- Dashboard → Table Editor → Buscar "kiosk_rate_limits" y "kiosk_security_events"

---

## 🧪 Paso 5: Test Local (Opcional pero Recomendado)

### 5.1. Configurar .env.local

Crea o actualiza `.env.local` con las keys de desarrollo:

```bash
# Cloudflare Turnstile - Test Keys
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA

# JWT Secret
KIOSK_SESSION_SECRET=UfHmpZimzZqFcf1NwIjAUEpBWPVXOH6k98KFgfdmZB4=
```

**Test Keys de Cloudflare**:
- `1x00000000000000000000AA` - Siempre pasa ✅
- `2x00000000000000000000AB` - Siempre falla ❌

### 5.2. Ejecutar Dev Server

```bash
pnpm run dev
```

### 5.3. Probar el Flujo

1. Abre: http://localhost:3000/kiosk
2. Ingresa un PIN válido (debe estar en tu DB)
3. Verás el widget de Turnstile aparecer
4. Click en el checkbox (auto-resolve con test keys)
5. Deberías llegar al dashboard del empleado

---

## 🚀 Paso 6: Deploy a Producción

### 6.1. Verificar que todo compila

```bash
pnpm run build
```

Si hay errores de TypeScript, detente y corrígelos antes de continuar.

### 6.2. Commit y Push

```bash
# Ver cambios
git status

# Añadir todos los archivos
git add .

# Commit
git commit -m "feat(kiosk): add Cloudflare Turnstile security + JWT sessions

- Add Turnstile widget for anti-bot protection (managed mode)
- Implement JWT session tokens (12h TTL, HS256)
- Add Supabase-backed rate limiting (5 attempts/15min)
- Add security event logging and monitoring
- Protect all kiosk endpoints with session authentication
- Add fail-open strategy for Turnstile availability
- Add i18n support (en, es, nl, de)
- Add preconnect hints for performance

Breaking Changes:
- /api/public/kiosk/verify-pin now requires turnstile_token
- All kiosk endpoints now require Authorization header with JWT token

Migration Required:
- Run: pnpm run db:migrate (creates kiosk_rate_limits and kiosk_security_events tables)

Environment Variables Required:
- NEXT_PUBLIC_TURNSTILE_SITE_KEY
- TURNSTILE_SECRET_KEY
- KIOSK_SESSION_SECRET

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push a main (dispara deploy automático en Vercel)
git push origin main
```

### 6.3. Monitorear el Deploy

1. Ve a Vercel Dashboard: https://vercel.com/
2. Ve a tu proyecto y verás el deployment en progreso
3. Espera a que termine (2-3 minutos)
4. Vercel ejecutará el build y desplegará automáticamente

---

## ✅ Paso 7: Verificación en Producción

### 7.1. Probar el Flujo Completo

1. Abre: https://grandcafe-cheers-app.vercel.app/kiosk (o tu dominio)
2. Toca "Touch to begin"
3. Ingresa un PIN válido de un empleado activo
4. **Verás el widget de Turnstile** - Deberías ver un checkbox o challenge
5. Completa el challenge
6. Deberías ver el dashboard del empleado
7. Prueba hacer clock-in/out, breaks, etc.

### 7.2. Verificar Rate Limiting

1. Ingresa un PIN **incorrecto** 5 veces seguidas
2. En el 6to intento deberías ver:
   ```
   "Too many attempts. Please try again later."
   ```
3. Esto confirma que el rate limiting funciona

### 7.3. Verificar Logs de Seguridad

Conecta a tu base de datos de Supabase y ejecuta:

```sql
-- Ver eventos recientes
SELECT event_type, metadata, created_at
FROM kiosk_security_events
ORDER BY created_at DESC
LIMIT 20;

-- Ver rate limits activos
SELECT ip_address, attempt_at, success
FROM kiosk_rate_limits
WHERE attempt_at > NOW() - INTERVAL '15 minutes'
ORDER BY attempt_at DESC;
```

Deberías ver eventos como:
- `turnstile_failed` (si hubo errores)
- `invalid_pin` (si ingresaste PINs incorrectos)
- `rate_limit_exceeded` (si excediste el límite)

---

## 🔍 Troubleshooting

### Problema: "Turnstile configuration error"

**Causa**: Las variables de entorno no están configuradas o están mal.

**Solución**:
1. Verifica en Vercel Dashboard → Settings → Environment Variables
2. Asegúrate de que `NEXT_PUBLIC_TURNSTILE_SITE_KEY` esté presente
3. Redeploy: `vercel --prod`

### Problema: "Security verification failed"

**Causa**: Secret Key incorrecta o el dominio no coincide.

**Solución**:
1. Verifica que el dominio en Cloudflare sea el correcto
2. Verifica que `TURNSTILE_SECRET_KEY` coincida con la de Cloudflare Dashboard
3. En Cloudflare Turnstile, ve a tu sitio y verifica el dominio configurado

### Problema: Widget no aparece

**Causa**: Site Key incorrecta o bloqueada por ad-blocker.

**Solución**:
1. Abre DevTools (F12) → Console, busca errores
2. Desactiva ad-blockers temporalmente
3. Verifica que `NEXT_PUBLIC_TURNSTILE_SITE_KEY` esté correcta

### Problema: "Session expired" constantemente

**Causa**: JWT secret cambió o no está configurado.

**Solución**:
1. Verifica que `KIOSK_SESSION_SECRET` esté en Vercel
2. No cambies el secret después del deploy (invalida tokens existentes)
3. Los tokens duran 12 horas, esto es normal si pasan más de 12h

---

## 📊 Monitoring Dashboard (Próximamente)

En el futuro puedes crear un dashboard para monitorear:

```sql
-- Eventos de seguridad por tipo (últimas 24h)
SELECT
  event_type,
  COUNT(*) as count
FROM kiosk_security_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type
ORDER BY count DESC;

-- IPs con más intentos fallidos
SELECT
  metadata->>'ip' as ip,
  COUNT(*) as failed_attempts
FROM kiosk_security_events
WHERE event_type = 'invalid_pin'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY ip
HAVING COUNT(*) > 3
ORDER BY failed_attempts DESC;
```

---

## 🎉 ¡Listo!

Tu kiosk ahora está protegido con:
- ✅ Cloudflare Turnstile (anti-bot)
- ✅ Rate limiting persistente (5 intentos/15min)
- ✅ Session tokens JWT (12h)
- ✅ Security event logging
- ✅ Fail-open strategy (disponibilidad prioritaria)

**Documentación de Cloudflare Turnstile**: https://developers.cloudflare.com/turnstile/

**Soporte**: Si tienes problemas, revisa los logs de Vercel y Supabase.
