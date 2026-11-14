# Infraestructura del MVP

Estado al sábado 14 de noviembre de 2026, madrugada. Analogía: la app es un puesto de feria
desmontable; solo se montó lo que el puesto necesita para atender, no un local entero.

## Qué está montado

| Pieza | Para qué | Estado |
|---|---|---|
| GitHub (`hackbbvapro-bit/BBVA`, público) | Repositorio del equipo para la final | Listo. Código subido a `main` el 14-nov-2026 [MEDIDO]. El repositorio anterior ya no se usa |
| Vercel (cuenta del equipo, proyecto `copiloto-anticipador-hack`) | Publicar la app con dirección `https` (obligatoria para micrófono y notificaciones) | **Publicada** en `https://copiloto-anticipador-hack.vercel.app`; cada cambio en `main` se publica solo [MEDIDO]. Pública, sin contraseña. `/api/estado` da `ia:true`, `voz:true`, `push:true` [MEDIDO 14-nov, tras Redeploy] |
| API de Anthropic | El agente que conversa y explica | Clave cargada en local y en Vercel (producción y vista previa) el 14-nov. Probado en local: responde con IA y con las cifras del motor [MEDIDO] |
| Fish Audio | La voz del agente (y transcribir audio como respaldo) | Clave y voz «Mayordomo Digital» (`9386123a44af4d43abf10de6e2eea923`) cargadas en local y en Vercel el 14-nov. Producción devuelve audio con esa voz [MEDIDO]. Transcripción sin probar |
| Notificaciones web (VAPID) | Avisos en el celular | Claves cargadas en el Vercel del equipo (producción y vista previa) el 14-nov; la clave pública publicada coincide con la local [MEDIDO]. **Sin probar en un celular real** |
| Supabase (cuenta del equipo) | Base de datos, si el equipo la necesita | Proyecto creado y enlazado al repositorio. **El código no lo usa** (ver abajo) |

## Qué NO se conectó y por qué

- **Supabase (base de datos y cuentas):** existe el proyecto en la cuenta del equipo, pero la
  demo usa tres perfiles sintéticos que viven en el código y el motor calcula en el propio
  celular. No hay nada que guardar. Conectarlo la noche antes de la final añade riesgo sin nada
  visible para el jurado. El plan gratuito se pausa tras ~1 semana sin uso.
- **Resend (correos):** los avisos van por notificación del celular y por voz, que es lo que se
  ve en una demo de tres minutos. Un correo no suma en el escenario. Queda como opción comentada
  en `.env.example`.
- **Cloudflare:** Vercel ya entrega dirección `https`, certificado y red de distribución. Solo
  haría falta para usar un dominio propio.

## Variables de entorno

Los nombres están en `.env.example`. Los valores van en `.env.local` (en la computadora, ignorado
por git) y en Vercel → Project → Settings → Environment Variables. **Nunca en el repositorio ni
en un chat.**

| Variable | Obligatoria | Quién la pone |
|---|---|---|
| `ANTHROPIC_API_KEY` | Para que el agente use IA | El dueño de la cuenta (console.anthropic.com) |
| `ANTHROPIC_MODEL` | No (por defecto `claude-opus-5-5`) | — |
| `FISH_API_KEY` | Para la voz de Fish Audio | El dueño de la cuenta (fish.audio) |
| `FISH_VOICE_ID` | Para la voz de Fish Audio | Elegida: `9386123a44af4d43abf10de6e2eea923` («Mayordomo Digital», voz pública de fish.audio) |
| `FISH_MODEL` | No (por defecto `s2.1-pro`) | — |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Para notificaciones | Ya generadas en `.env.local` y cargadas en el Vercel del equipo |

Para cargar una variable en Vercel desde la terminal (pide el valor sin mostrarlo en pantalla):

```bash
npx vercel env add ANTHROPIC_API_KEY production
```

Para cambiar el valor de una variable que ya existe, usa `npx vercel env update NOMBRE --environment production`
(borrarla con `env rm` pide una aprobación aparte en la terminal).

## Plan B: la app funciona sin claves

Cada pieza externa tiene un respaldo, para que la demo no dependa del wifi del evento:

| Si falla… | La app hace esto |
|---|---|
| La clave o la red de Anthropic | Responde con textos armados por el propio motor (mismos números, sin IA) |
| Fish Audio | Usa la voz del propio celular |
| El reconocimiento de voz del navegador | Graba el audio y lo transcribe con Fish Audio; si tampoco, se escribe |
| Las notificaciones | Los avisos siguen en la campanita dentro de la app |

`GET /api/estado` dice qué piezas están activas (sin mostrar ninguna clave): devuelve `ia`, `voz`
y `push` en `true` o `false`.

## Límites que conviene saber

- **Gasto de las claves:** las rutas que gastan (agente, voz y transcripción) tienen un límite por
  minuto y un tope por hora, pero ambos viven en la memoria de cada copia del servidor: no son un
  tope global de verdad. El freno real es el **límite de gasto en los paneles de Anthropic y Fish
  Audio**, que debe poner el dueño de la cuenta antes de cargar las claves (paso 1 de
  `docs/GUIA-FINAL.md`).
- **Sin internet no hay recarga:** la app se puede instalar en el celular, pero no guarda copia
  para funcionar sin red. Con la app ya abierta, Hoy y Deudas siguen calculando; el chat con IA,
  la voz de Fish y las notificaciones necesitan red.
- **iPhone:** las notificaciones solo funcionan si la app se instaló con «Compartir → Añadir a
  pantalla de inicio» y el permiso se pide con un toque. Hay que probarlo en un iPhone real.
- **Vercel gratuito:** si un compañero sube código y no se publica, revisa en Vercel →
  Deployments si quedó bloqueado por no ser el dueño del proyecto.
- **Sin base de datos:** las suscripciones a notificaciones no se guardan; el aviso de prueba se
  envía en el momento, desde el celular que lo pide.
