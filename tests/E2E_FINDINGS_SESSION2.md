# E2E Testing Findings — Session 2

> Fecha: 2026-03-14
> Foco: /gift (voucher), /digital (carta), landing mobile, fixes pendientes
> Viewports: 1440x900, 768x1024, 375x812

---

## /gift — Gift Voucher Page

### VISUAL / UX (CRITICAL — pagina publica customer-facing)

**G1. Diseño primitivo, sin identidad de marca**
La pagina se siente como un wireframe con colores. No tiene la calidad visual Apple-style que logramos en la landing. Issues especificos:
- Hero gradient rojo solido sin foto ni textura — se ve flat y generico
- Progress stepper basico (circulos con numeros) sin animaciones
- Amount buttons son rectangulos planos sin hover effects ni micro-interactions
- Style cards (Elegant/Tropical/Celebration/Seasonal) son cajas de color sin preview real del voucher
- Preview del voucher (step 2) es un rectángulo beige con texto — sin diseño real, sin marca
- Formulario (step 3) inputs sin iconos, sin placeholders descriptivos, sin refinamiento
- Footer es una sola linea con direccion — no tiene coherencia con el footer de la landing

**G2. Voucher generado sin estilo**
La preview del voucher es un rectangulo con "GIFT VOUCHER", logo pequeño, y €50 — se ve como un placeholder temporal. Un voucher real deberia tener:
- Diseño premium con gradientes/texturas por estilo (Elegant, Tropical, etc.)
- Nombre del destinatario y mensaje personal visibles
- Codigo QR o codigo de barras para redencion
- Fecha de expiracion
- Diseño diferente para cada estilo (actualmente todos se ven casi iguales)

**G3. Responsive: funcional pero sin optimizacion mobile**
- Mobile: todo se apila correctamente, pero:
  - Hero toma demasiado espacio vertical
  - Progress stepper pierde las labels en mobile (solo numeros)
  - Style cards grid 2x2 es demasiado pequeño para tocar con precision
  - Boton "Next" queda debajo del fold sin indicacion de scroll

**G4. Sin transiciones entre steps**
- El cambio de step es instantaneo sin animacion — deberia tener slide/fade como el booking wizard

**G5. "IVA incluido (21%)" mezclado espanol/ingles**
- El badge "IVA incluido" esta en español mientras el resto de la pagina esta en ingles — inconsistencia de i18n (ver H2 de session 1)

**G6. Sin selector de idioma**
- A diferencia de la landing que tiene un selector de idioma prominente, la pagina de gift no tiene ninguno. El cliente no puede cambiar idioma.

**G7. Sin dark mode support**
- El hero usa gradient hardcoded. El body usa light mode forzado. No respeta la preferencia del usuario.

---

## /digital — Digital Menu (Carta)

### VISUAL / UX

**D1. Header "GrandCafe Che..." truncado en mobile**
- El nombre se trunca a "GrandCafe Che..." en 375px. Deberia mostrar solo "Cheers" o usar el logo sin texto.

**D2. Categorias: no se ve que hay scroll horizontal en mobile**
- La barra de categorias se corta en "Burg..." pero no hay indicador visual de que hay mas categorias a la derecha (fade, flecha, o shadow)

**D3. Signature Cocktails: solo 1 item con mucho espacio vacio (desktop)**
- La seccion "Signature Cocktails" muestra 1 cocktail en una fila de 4 columnas, dejando 3/4 de la fila vacia. Se ve desequilibrado.

**D4. Cards sin descripcion**
- Las cards de items muestran foto + nombre + precio, pero NO muestran descripcion. El cliente no sabe que contiene cada plato sin hacer click.

**D5. Precio en esquina superior derecha de la card**
- El badge de precio esta superpuesto sobre la foto en la esquina — puede ser dificil de leer si la foto es clara. Deberia estar en la zona de texto debajo.

**D6. Fotos de cerveza repetitivas**
- Varias cervezas (Desperados, Duvel, Erdinger, Grimbergen, Inedit, Kilkenny) usan la misma foto generica de cerveza de barril. Se siente generico.

**D7. Sin animaciones de entrada**
- Los items aparecen todos de golpe sin stagger/fade. En la landing usamos animaciones de viewport reveal que le dan vida.

**D8. Allergen info button poco visible**
- El icono de info (ℹ) en el header es muy pequeño y no tiene label. Clientes con alergias podrian no encontrarlo.

**D9. Search sin debounce visual**
- El search funciona pero no hay feedback visual mientras filtra (no hay skeleton, loader, ni counter de resultados).

**D10. Title "GrandCafe Cheers Manager" en el tab del browser**
- El title es "GrandCafe Cheers Manager" — deberia ser "Menu | GrandCafe Cheers" o "Carta Digital | GrandCafe Cheers". "Manager" no deberia aparecer en una pagina publica.

**D11. Sin experiencia QR-first**
- Cuando un cliente escanea un QR de la mesa, deberia ver:
  - Mensaje de bienvenida ("Mesa T01 — Bienvenido")
  - Quizas el nombre del camarero asignado
  - Boton para llamar al camarero
  - Ofertas del dia / happy hour
  - Actualmente solo muestra el badge "T01" en el header

### RESPONSIVE

**D12. Desktop 1440px: cards muy grandes**
- Las fotos de items ocupan mucho espacio vertical. Con 4 columnas, cada card es ~300px de alto, haciendo que el usuario vea solo 2 filas por pantalla.

**D13. Tablet 768px: podria usar 3 columnas**
- En tablet se ve como desktop (4 cols) lo cual hace las cards demasiado pequeñas, o como mobile (2 cols) que desperdicia espacio. Faltan breakpoints intermedios.

---

## Landing Mobile — Issues de Parallax

**L1. Parallax con useScroll/useTransform puede no funcionar en iOS Safari**
- Framer Motion useScroll funciona mejor que CSS `background-attachment: fixed`, pero en algunos dispositivos iOS puede causar jank o no aplicarse correctamente. Necesita testing en dispositivo real.

**L2. Stats counter muestra "0/5", "0", "0" inicialmente**
- Antes de que el viewport entre, los counters muestran 0. Deberia mostrar el valor final como fallback si `IntersectionObserver` no esta disponible.

**L3. Floating button + chat button solapan (pendiente M2)**
- Confirmado en mobile: ambos botones compiten por la esquina inferior derecha.

---

## Fixes Pendientes de Session 1

| # | Issue | Estado |
|---|-------|--------|
| C2 | Kiosk Turnstile bloquea check-in | PENDIENTE |
| M1 | favicon.ico 404 | PENDIENTE |
| M2 | Floating + chat overlap | PENDIENTE |

---

## Issues Totales (Session 1 + Session 2)

| Area | Nuevos | Acumulado |
|------|--------|-----------|
| Gift /voucher UX | 7 | 7 |
| Digital menu UX | 13 | 13 |
| Landing mobile | 3 | 3 |
| Pendientes S1 | 0 | 3 |
| **TOTAL** | **23** | **51** (28 S1 + 23 S2) |
