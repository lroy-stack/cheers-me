# AI Assistant Production Fix - Verification Guide

## Problemas Identificados y Resueltos

### ✅ Fix 1: Timeout de Vercel en Streaming
**Problema:** Vercel mataba conexiones después de 30 segundos (default), causando desconexiones del AI assistant.

**Solución:** Añadido `export const maxDuration = 60` en `/src/app/api/ai/chat/stream/route.ts`

**Archivo modificado:** `src/app/api/ai/chat/stream/route.ts`

### ✅ Fix 2: URL de Producción Incorrecta
**Problema:** `NEXT_PUBLIC_APP_URL` estaba configurado como `http://localhost:3000` en producción, causando que todas las write operations (crear turnos, reservas, etc.) fallaran.

**Solución:** Actualizado en Vercel a `https://grandcafe-cheers-app.vercel.app`

**Variables actualizadas:**
- `NEXT_PUBLIC_APP_URL` en Production
- `NEXT_PUBLIC_APP_URL` en Preview

### ✅ Fix 3: Commit Deployed
**Commit:** `ba07b85` - "fix(ai): add maxDuration for streaming and validate env vars"

---

## Cómo Verificar que el AI Funciona

### 1. Esperar a que el Build Complete

```bash
vercel ls
# Esperar hasta ver "● Ready" en el deployment más reciente
```

### 2. Abrir la App en Producción

URL: https://grandcafe-cheers-app.vercel.app

### 3. Test del AI Assistant

1. **Login** con tu cuenta admin/owner
2. Navegar a `/assistant` o hacer click en el botón de AI
3. **Enviar un mensaje simple:**
   ```
   Hola, ¿qué puedes hacer?
   ```
4. **Verificar streaming:** Deberías ver el texto aparecer palabra por palabra (no todo de golpe)

### 4. Test de Write Operations (Crítico)

Enviar un comando que requiera una write operation:

```
Dame un resumen de los turnos de hoy
```

o

```
¿Cuántos empleados tenemos activos?
```

**Si funciona:** El AI responderá con datos reales de tu DB.

**Si NO funciona:** Verás error como "Failed to fetch" o "Action failed"

### 5. Test de Timeout (Long-running)

Enviar una query compleja que tarde >30 segundos:

```
Genera un reporte completo de ventas del último mes con análisis de tendencias y recomendaciones
```

**Antes del fix:** Se desconectaba a los 30 segundos.

**Después del fix:** Debería completar sin desconectar (hasta 60 segundos).

---

## Troubleshooting

### Si el AI sigue sin funcionar:

#### A. Verificar Variables de Entorno

```bash
vercel env pull .env.production.local --yes
cat .env.production.local | grep -E "(NEXT_PUBLIC_APP_URL|ANTHROPIC_API_KEY)"
rm .env.production.local
```

**Debe mostrar:**
```
NEXT_PUBLIC_APP_URL="https://grandcafe-cheers-app.vercel.app"
ANTHROPIC_API_KEY="sk-ant-api03-xxxxx"
```

**Si `NEXT_PUBLIC_APP_URL` aún es localhost:** Volver a ejecutar:
```bash
echo "https://grandcafe-cheers-app.vercel.app" | vercel env add NEXT_PUBLIC_APP_URL production --force
```

Luego forzar redeploy:
```bash
vercel --prod --force
```

#### B. Verificar Logs de Vercel

```bash
vercel logs --follow --prod
```

Buscar errores como:
- `ANTHROPIC_API_KEY is undefined`
- `fetch failed to http://localhost:3000`
- `Stream timeout after 30000ms`
- `401 Unauthorized`

#### C. Browser Console

Abrir DevTools (F12) → Console tab

Buscar errores:
- `HTTP 500` → Error en el servidor
- `HTTP 401` → Auth fallando
- `fetch failed` → Network issue
- `EventSource error` → Streaming issue

#### D. Network Tab

1. Abrir DevTools → Network tab
2. Enviar mensaje al AI
3. Buscar request a `/api/ai/chat/stream`
4. Verificar:
   - Status: `200 OK`
   - Type: `eventsource` o `text/event-stream`
   - Response: Debe tener `event:` y `data:` fields

---

## Variables de Entorno Críticas

Estas DEBEN estar configuradas en Vercel para que el AI funcione:

| Variable | Valor Ejemplo | Dónde Configurarlo |
|----------|---------------|-------------------|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-xxxxx` | Vercel Dashboard → Settings → Environment Variables |
| `NEXT_PUBLIC_APP_URL` | `https://grandcafe-cheers-app.vercel.app` | Vercel Dashboard → Settings → Environment Variables |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Vercel Dashboard → Settings → Environment Variables |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJxxx` | Vercel Dashboard → Settings → Environment Variables |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJxxx` | Vercel Dashboard → Settings → Environment Variables |

---

## Próximos Pasos Recomendados

### Mejoras de Monitoreo (Post-Fix)

1. **Agregar logging de errores:**
   - Integrar Sentry o similar para tracking de errores en producción
   - Logs estructurados para debugging

2. **Agregar healthcheck endpoint:**
   ```typescript
   // src/app/api/health/route.ts
   export async function GET() {
     return Response.json({
       ai_configured: !!process.env.ANTHROPIC_API_KEY,
       app_url: process.env.NEXT_PUBLIC_APP_URL,
       timestamp: new Date().toISOString()
     })
   }
   ```

3. **Migrar rate limiter a Redis/Upstash:**
   - Actual: In-memory (se resetea en cold starts)
   - Mejor: Upstash Redis (persistente, gratis hasta 10k req/día)

### Mejoras de Resiliencia

1. **Agregar retry logic en frontend:**
   - Auto-reconectar si streaming se cae
   - Resume desde último mensaje

2. **Agregar CORS headers:**
   - Prevenir errores si frontend/backend en diferentes dominios

3. **Validar env vars on startup:**
   ```typescript
   if (!process.env.ANTHROPIC_API_KEY) {
     throw new Error('ANTHROPIC_API_KEY is required')
   }
   ```

---

## Estado Actual

- ✅ `maxDuration` añadido → Streaming puede durar hasta 60 segundos
- ✅ `NEXT_PUBLIC_APP_URL` corregido → Write operations usan URL correcta
- ✅ Commit pushed → Deploy en progreso
- ⏳ Deploy building → Verificar en 2-3 minutos

**Deployment URL:** https://grandcafe-cheers-app.vercel.app

---

## Contacto

Si el AI sigue sin funcionar después de estos fixes, revisar:
1. Logs de Vercel (`vercel logs --prod`)
2. Browser console (DevTools → Console)
3. Este documento de troubleshooting

**Documento creado:** 2026-02-11
**Commit del fix:** `ba07b85`
