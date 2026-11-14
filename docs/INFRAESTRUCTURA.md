# Infraestructura del MVP

Estado al viernes 13 de noviembre de 2026 por la noche. Analogía: la app es un puesto de feria
desmontable; solo se montó lo que el puesto necesita para atender, no un local entero.

## Qué está montado

| Pieza | Para qué | Estado |
|---|---|---|
| GitHub (repositorio privado) | Guardar el código y trabajar en equipo | Listo. Rama `base-motor` subida y pull request 1 abierto. **Sin fusionar a `main`** |
| Vercel (proyecto `copiloto-anticipador`) | Publicar la app con dirección `https` (obligatoria para micrófono y notificaciones) | Proyecto creado y conectado al repositorio. **Producción sin publicar**: se publica al fusionar el pull request [ASUMIDO] |
| API de Anthropic | El agente que conversa y explica | Código listo. **Falta la clave** |
| Fish Audio | La voz del agente (y transcribir audio como respaldo) | Código listo. **Faltan la clave y el id de la voz** |
| Notificaciones web (VAPID) | Avisos en el celular | Claves generadas en `.env.local` y cargadas en Vercel (Production y Preview). **Sin probar en un celular real** |

## Qué NO se montó y por qué

- **Supabase (base de datos y cuentas):** la demo usa tres perfiles sintéticos que viven en el
  código y el motor calcula en el propio celular. No hay nada que guardar. Además, la cuenta
  gratuita ya tiene sus dos proyectos ocupados por proyectos reales y no se tocan. Si después de
  la hackathon se quisiera guardar usuarios, es la pieza natural a añadir.
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
| `FISH_VOICE_ID` | Para la voz de Fish Audio | Id de una voz en español elegida en fish.audio |
| `FISH_MODEL` | No (por defecto `s2.1-pro`) | — |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Para notificaciones | Ya generadas en `.env.local` y cargadas en Vercel |

Para cargar una variable en Vercel desde la terminal (pide el valor sin mostrarlo en pantalla):

```bash
npx vercel env add ANTHROPIC_API_KEY production
```

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
- **Vercel gratuito con repositorio privado:** puede bloquear el despliegue de commits hechos por
  alguien que no es el dueño del proyecto. Si un compañero sube código y no se publica, es eso.
- **Sin base de datos:** las suscripciones a notificaciones no se guardan; el aviso de prueba se
  envía en el momento, desde el celular que lo pide.
