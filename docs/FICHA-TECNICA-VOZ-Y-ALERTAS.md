# Ficha técnica: voz (Fish Audio) y alertas (push, email) para el MVP

Fecha de consulta: 2026-11-13. Stack: Next.js (App Router) + TS en Vercel, Supabase, Claude, Fish Audio.

## Cómo se verificó (leer primero)

- La herramienta WebFetch NO estuvo disponible y `curl` fue bloqueado por el entorno. Todo lo de abajo viene de **búsquedas web que devolvieron resúmenes de las páginas oficiales**, no de la lectura literal de cada página.
- Marcas: **[VERIFICADO-RESUMEN]** = lo afirman las páginas oficiales citadas (según el resumen del buscador). **[TERCEROS]** = solo lo dice un tercero. **[SIN VERIFICAR]** = no encontrado o es de memoria: probar antes de confiar.
- Los fragmentos de código son plantillas basadas en esos hechos; **ninguno se ejecutó**. Prueba cada uno con una clave real esta noche.
- Antes de codificar, abre una vez `https://docs.fish.audio/api-reference/openapi.json` (esquema autoritativo de campos y valores por defecto) [SIN VERIFICAR su contenido; la URL la citó el buscador].

---

## 1. Fish Audio

### 1.1 TTS por HTTP

- Endpoint: `POST https://api.fish.audio/v1/tts` [VERIFICADO-RESUMEN]
  - https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech
  - https://docs.fish.audio/.well-known/agent-skills/fish-audio-api/SKILL.md
- Cabeceras: `Authorization: Bearer <FISH_API_KEY>`, `Content-Type: application/json` (también acepta `application/msgpack`) y cabecera `model` (los ejemplos oficiales usan `s2-pro`). Hay contradicción en la doc: el OpenAPI trata `model` como opcional, pero un texto de prosa aún dice que es obligatoria (https://github.com/fishaudio/docs/pull/110/files). **Envíala siempre.**
- Cuerpo (campos citados por la doc/SDK): `text`, `reference_id` (ID de voz; si es un array = multi-hablante, solo familia S2), `format` (`mp3` | `wav` | `pcm` | `opus`, por defecto `mp3`), `latency` (los ejemplos usan `"normal"` y `"balanced"`; la guía dice que `balanced` da ~300 ms al primer audio), `chunk_length` (100-300; por defecto 200 según la guía de buenas prácticas, 300 según proxies de terceros), `prosody` (`speed`, `volume`). Otros que aparecen solo en un proxy de terceros (Novita): `normalize`, `sample_rate`, `mp3_bitrate`, `opus_bitrate`, `temperature`, `top_p` [TERCEROS; confirmar en openapi.json].
  - https://docs.fish.audio/api-reference/sdk/python/types
  - https://docs.fish.audio/resources/best-practices/text-to-speech
- **Streaming HTTP: sí.** La respuesta son bytes de audio crudos con `Transfer-Encoding: chunked`, sin envoltorio JSON, en el formato pedido en `format` [VERIFICADO-RESUMEN]. https://docs.fish.audio/.well-known/agent-skills/fish-audio-api/SKILL.md
- Modelos hoy [VERIFICADO-RESUMEN] (https://docs.fish.audio/developer-guide/models-pricing/models-overview):
  - `s2.1-pro`: recomendado para producción, 83 idiomas.
  - `s2-pro`: generación anterior, 80+ idiomas.
  - `s1`: **deprecado, se retira el 31-dic-2026** (luego las peticiones con s1 se sirven con s2.1-pro); 13 idiomas, incluye español.
  - `s2.1-pro-free`: nivel gratuito (ver 1.7). https://fish.audio/blog/s2-1-pro-free-api/
  - Que el español esté en S2/S2.1 no lo nombra el resumen explícitamente; entra en «80+/83 idiomas» [SIN VERIFICAR en la lista de idiomas]. Prueba con una frase en español.
- Límite de caracteres por petición: la doc oficial no lo da en lo que se vio [SIN VERIFICAR]. Terceros dicen 1-5000 caracteres (Pixazo, otro modelo). **Trocea el texto por frases (≤ 300 caracteres por trozo) y no dependas de esto.**
- Latencia: la doc oficial no da cifra medida; terceros citan ~90-100 ms al primer audio [TERCEROS]. Usa `latency: "balanced"` y mide tú mismo desde Vercel.

### 1.2 WebSocket en tiempo real

- URL: `wss://api.fish.audio/v1/tts/live`, mensajes en MessagePack [VERIFICADO-RESUMEN parcial; la URL la da un ejemplo de terceros, confirmar en https://docs.fish.audio/api-reference/endpoint/websocket/tts-live].
- Flujo: el cliente envía un evento `start` (con la configuración; `text` vacío, `format`, `chunk_length`, `reference_id`...), luego eventos `text` por trozos, opcional `flush`, y `close` al terminar. Auth con `Authorization: Bearer` en la conexión. https://docs.fish.audio/features/realtime-streaming
- **Nombres exactos de eventos y estructura msgpack: [SIN VERIFICAR].** Para el MVP **no lo uses**: la clave API no puede ir en el navegador y Vercel no sirve WebSockets de larga duración como servidor. Usa el HTTP chunked de 1.1.
- Alternativa: endpoint compatible con OpenAI Realtime `wss://api.fish.audio/compat/v1/realtime` (https://docs.fish.audio/developer-guide/compat/realtime-protocol) [TERCEROS/resumen; no probado].

### 1.3 Voz a texto (ASR/STT)

- `POST https://api.fish.audio/v1/asr`, **beta**. Entrada: `multipart/form-data` (campo `audio` según los ejemplos curl: «file form field») o `application/msgpack`; **no** acepta base64 en JSON. Campos opcionales: `language` (ej. `"en"`, `"zh"`; si se omite autodetecta), `ignore_timestamps`. Cabecera `model`: el recomendado es `transcribe-1-pro`. Hasta 60 min por petición (si no, 400 `audio_too_long`). Síncrono. Respuesta: `text` y, si hay marcas de tiempo, `segments` con inicio/fin. [VERIFICADO-RESUMEN]
  - https://docs.fish.audio/api-reference/endpoint/openapi-v1/speech-to-text
  - https://docs.fish.audio/features/speech-to-text
- Lista completa de códigos de idioma y el código para español-Perú: [SIN VERIFICAR]. Prueba `language: "es"`.

### 1.4 SDKs

- JavaScript/TypeScript: paquete npm **`fish-audio`** (v0.1.0 según un índice de terceros, «early release», Node ≥ 18, solo servidor). `npm install fish-audio`. Ojo: `fish-audio-sdk` en npm es una librería **no oficial**. [VERIFICADO-RESUMEN]
  - https://docs.fish.audio/developer-guide/sdk-guide/javascript/installation
  - https://docs.fish.audio/api-reference/sdk/javascript/api-reference
  - Trampas: el SDK JS usa `s1` por defecto, y su tipo `Backends` no incluye `s2.1-pro`/`s2.1-pro-free` (hay que forzar el tipo o usar REST directo). Por eso **este documento usa `fetch` directo.**
- Python: `pip install fish-audio-sdk` (se importa como `fishaudio`; el `fish_audio_sdk` con `Session` es el legado). https://docs.fish.audio/api-reference/sdk/python/overview · https://github.com/fishaudio/fish-audio-python

```python
# Python (secrets via env var FISH_API_KEY)
from fishaudio import FishAudio
from fishaudio.utils import save
client = FishAudio()  # reads FISH_API_KEY
audio = client.tts.convert(text="Hola", reference_id="<VOICE_ID>", model="s2.1-pro-free")
save(audio, "out.mp3")
```

### 1.5 Elegir una voz en español latino (sin inventar IDs)

- `GET https://api.fish.audio/model` con Bearer. Filtros documentados: `language`, `title_language`, `tag`, `self` (true = solo tus voces; omitido = biblioteca pública), `author_id`, `page_size`, `page_number`, `sort_by`, visibilidad y solo-licenciadas. [VERIFICADO-RESUMEN] https://docs.fish.audio/api-reference/endpoint/model/list-models · https://docs.fish.audio/features/manage-voices
- El `_id` de cada modelo devuelto **es el `reference_id`** para TTS. También se ve en la URL de la voz en la web (`fish.audio/m/<id>`).
- Código de idioma para español y cómo distinguir acento latino: [SIN VERIFICAR]. Procedimiento: listar y **escuchar 3-4 candidatas** esta noche.

```bash
# List public voices tagged Spanish (check exact param values in the List Models page)
curl -s -H "Authorization: Bearer $FISH_API_KEY" \
  "https://api.fish.audio/model?language=es&page_size=20&sort_by=score" | head -c 4000
```

(`sort_by=score` es [SIN VERIFICAR]; quítalo si da error.) Guarda el ID elegido en la variable de entorno `FISH_VOICE_ID`, no en el código.

### 1.6 Ruta de Next.js (Node runtime): texto → MP3 en streaming

```ts
// app/api/tts/route.ts
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { text } = (await req.json()) as { text?: string };
  if (!text || text.length > 600) {
    return Response.json({ error: "text required, max 600 chars" }, { status: 400 });
  }
  const apiKey = process.env.FISH_API_KEY;
  if (!apiKey) return Response.json({ error: "not configured" }, { status: 500 });

  const upstream = await fetch("https://api.fish.audio/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      model: process.env.FISH_MODEL ?? "s2.1-pro-free",
    },
    body: JSON.stringify({
      text,
      reference_id: process.env.FISH_VOICE_ID, // from GET /model
      format: "mp3",
      latency: "balanced",
      chunk_length: 200,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    // never forward upstream error bodies that may leak details
    return Response.json({ error: "tts_failed", status: upstream.status }, { status: 502 });
  }
  // Pass the chunked MP3 bytes straight through
  return new Response(upstream.body, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}
```

Cliente (reproducir). Lo más seguro en iPhone: descargar y reproducir al terminar, dentro de un gesto del usuario.

```ts
// client: call from a click handler (iOS blocks autoplay without a user gesture)
export async function speak(text: string) {
  const r = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!r.ok) throw new Error("tts failed");
  const blob = await r.blob();           // simple + works everywhere (adds ~latency of full clip)
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.onended = () => URL.revokeObjectURL(url);
  await audio.play();
}
```

Reproducción verdaderamente progresiva en el navegador (MediaSource con `audio/mpeg`) funciona en Chrome pero en iPhone Safari el soporte de MSE es limitado [SIN VERIFICAR, de memoria]. Para la demo: frases cortas (1-2 oraciones, ≤ 200 caracteres), así `blob()` tarda poco. Truco iOS: crea y «desbloquea» un `Audio` en el primer toque del usuario [ASUMIDO, patrón conocido, no de la doc de Fish].

### 1.7 Precios y límites

- Pago por uso, sin suscripción ni mínimo para la API [VERIFICADO-RESUMEN]. https://docs.fish.audio/developer-guide/models-pricing/pricing-and-rate-limits
- Tarifa s2-pro: ~15 USD por millón de bytes UTF-8 [TERCEROS; no confirmado en la página oficial].
- **`s2.1-pro-free`**: sin tarjeta, sin tope duro de caracteres, sujeto a «política de uso justo», sin SLA; productos con más de 1 M USD de ingresos anuales deben contactarlos [VERIFICADO-RESUMEN] https://fish.audio/blog/s2-1-pro-free-api/. Un tercero dice que el acceso gratis podría ser temporal «hasta noviembre de 2026» [TERCEROS]: **comprueba hoy que `s2.1-pro-free` responde**, y ten plan B.
- Concurrencia: según un agregador, 5 peticiones simultáneas con < 100 USD gastados [TERCEROS]. Al llegar al límite la API responde **429 sin cabecera `Retry-After`** [VERIFICADO-RESUMEN]. Plan: cola de un solo audio a la vez en la demo y reintento con espera.
- Plan B de voz si Fish falla en el escenario: `speechSynthesis` del navegador (sin red) [ASUMIDO].

---

## 2. Reconocer voz en el navegador (respaldo)

### 2.1 Web Speech API (SpeechRecognition)

- Se usa con prefijo `webkitSpeechRecognition` (la propia doc de Chrome lo indica): https://developer.chrome.com/blog/voice-driven-web-apps-introduction-to-the-web-speech-api
- Soporte: Chrome/Edge/Samsung Internet sí; Safari macOS 14.1+ e iOS 14.5+ (según una guía de terceros); Firefox y Opera no [TERCEROS]. **Chrome Android: no se confirmó con fuente** [SIN VERIFICAR], aunque se espera que sí.
- Idioma: `recognition.lang = "es-PE"` (o `"es-419"`); que cada motor soporte exactamente esos códigos [SIN VERIFICAR]; prueba `es-PE`, y si falla `es-419`/`es-MX`.
- Limitaciones: en Chrome el audio va a un servicio de Google (necesita Internet y es un tema de privacidad); en iOS suele requerir gesto del usuario y que Siri/dictado estén activos [ASUMIDO]; hubo reportes de fallos en Edge 147 en 2026 (https://techcommunity.microsoft.com/discussions/edgeinsiderdiscussions/web-speech-api-not-working-in-edge-v-147/4514880/replies/4515927). Trátalo como mejora, nunca como único camino.

```ts
const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
if (SR) {
  const rec = new SR();
  rec.lang = "es-PE";
  rec.interimResults = false;
  rec.onresult = (e: any) => console.log(e.results[0][0].transcript);
  rec.onerror = (e: any) => console.warn(e.error);
  // must run inside a click handler
  rec.start();
}
```

### 2.2 MediaRecorder + STT en el servidor (Fish `/v1/asr`)

- Chrome/Android: graba `audio/webm;codecs=opus`. Safari/iOS: históricamente solo MP4/AAC (`audio/mp4`); un artículo dice que Safari ≥ 18.4 también graba WebM [TERCEROS, provisional]. https://blog.addpipe.com/recording-audio-in-the-browser-using-pure-html5-and-minimal-javascript
- Patrón: probar con `MediaRecorder.isTypeSupported` en orden y usar el primero.
- Si Fish ASR rechaza el contenedor (`webm` vs `mp4`) [SIN VERIFICAR qué formatos acepta], usa el que acepte; el formato de entrada admitido no se vio en la doc.

```ts
function pickMime() {
  const c = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/wav"];
  return c.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}
async function record(ms: number) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); // needs HTTPS + gesture
  const mimeType = pickMime();
  const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  const done = new Promise<Blob>((res) => (rec.onstop = () => res(new Blob(chunks, { type: rec.mimeType }))));
  rec.start(); setTimeout(() => rec.stop(), ms);
  const blob = await done;
  stream.getTracks().forEach((t) => t.stop());
  return blob;
}
```

```ts
// app/api/stt/route.ts  (Node runtime)
export const runtime = "nodejs";
export async function POST(req: Request) {
  const inForm = await req.formData();
  const file = inForm.get("audio") as File;
  const out = new FormData();
  out.append("audio", file);           // field name per Fish curl examples; verify
  out.append("language", "es");
  const r = await fetch("https://api.fish.audio/v1/asr", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.FISH_API_KEY}`, model: "transcribe-1-pro" },
    body: out,
  });
  if (!r.ok) return Response.json({ error: "stt_failed" }, { status: 502 });
  return Response.json(await r.json()); // { text, ... }
}
```

(Nombre del campo `audio` y cabecera `model` para ASR: [SIN VERIFICAR el nombre exacto del campo]; el resumen dijo «file form field».)

---

## 3. Notificaciones push en PWA (2026)

### 3.1 Requisitos

- **iOS/iPadOS: solo funciona en la web app añadida a la pantalla de inicio**, desde iOS/iPadOS 16.4; no funciona dentro de Safari normal. Los permisos se piden **solo como respuesta a un toque directo** (un botón «Activar avisos»); en la carga de página o tras un temporizador no sale el diálogo. [VERIFICADO-RESUMEN para 16.4 y pantalla de inicio; gesto: OneSignal]
  - https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
  - https://documentation.onesignal.com/docs/web-push-for-ios
- En iOS/iPadOS 16.4-18 el manifest debe tener `display: "standalone"` (o `fullscreen`) para abrirse como web app; en iOS 26 todo sitio añadido abre como web app. [TERCEROS: OneSignal]
- iPadOS puede declararse como Mac de escritorio en el user agent: detecta «Mac con pantalla táctil» como iPad.
- Android/Chrome: funciona en el navegador y en la PWA instalada, pedir permiso tras un gesto. [ASUMIDO, conocimiento general; no verificado en fuente en esta sesión]

### 3.2 Manifest y service worker (guía oficial de Next.js)

La guía oficial (https://nextjs.org/docs/app/guides/progressive-web-apps) define el manifest en `app/manifest.ts` y un `public/sw.js` escrito a mano [VERIFICADO-RESUMEN: manifest; el resto, de memoria].

```ts
// app/manifest.ts
import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Copiloto",
    short_name: "Copiloto",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0b3a8f",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
```

```js
// public/sw.js
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "Aviso", body: "" };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      data: { url: data.url || "/" },
    })
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
```

### 3.3 VAPID + `web-push` (pasos mínimos)

```bash
npm i web-push
npx web-push generate-vapid-keys   # prints public + private key (do NOT commit)
# env: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT=mailto:<team-mail>
```

```ts
// client: inside a click handler
const reg = await navigator.serviceWorker.register("/sw.js");
const perm = await Notification.requestPermission();
if (perm === "granted") {
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
  });
  await fetch("/api/push/subscribe", { method: "POST", body: JSON.stringify(sub), headers: { "Content-Type": "application/json" } });
}
// urlBase64ToUint8Array: standard helper (base64url -> Uint8Array)
```

```ts
// app/api/push/send/route.ts
import webpush from "web-push";
export const runtime = "nodejs";
webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);

export async function POST(req: Request) {
  const { subscription, title, body } = await req.json(); // in prod: load subscription from Supabase, not from the request
  await webpush.sendNotification(subscription, JSON.stringify({ title, body, url: "/" }));
  return Response.json({ ok: true });
}
```

Guardar suscripciones: una tabla en Supabase (`endpoint`, `keys`) o, para la demo, en memoria/`localStorage`+envío directo. Las suscripciones deben guardarse en servidor para mandar alertas «desde fuera». Fuentes de terceros del flujo: https://medium.com/@ameerezae/implementing-web-push-notifications-in-next-js-a-complete-guide-e21acd89492d · https://www.buildwithmatija.com/blog/turn-nextjs-16-app-into-pwa (no se abrió su código; la secuencia VAPID/`setVapidDetails`/`applicationServerKey` coincide con lo resumido).

### 3.4 Probar

- Localhost: los service workers y push funcionan en `http://localhost` (contexto seguro) en Chrome [ASUMIDO, conocimiento general]. `next dev` sirve; usa `next build && next start` si el SW se comporta raro.
- iPhone: **solo en HTTPS desplegado** (Vercel preview/producción): abrir en Safari → Compartir → «Añadir a pantalla de inicio» → abrir desde el icono → pulsar «Activar avisos». Probar esto **esta noche en un iPhone real**; en simulador de iOS no se verificó que push funcione [SIN VERIFICAR].

---

## 4. Resend

- Remitente de pruebas `onboarding@resend.dev` sin verificar dominio, **pero solo puede enviar al correo de la cuenta de Resend**; a otros destinatarios devuelve 403 «You can only send testing emails to your own email address». Para otros, verificar dominio. [VERIFICADO-RESUMEN] https://resend.com/docs/knowledge-base/403-error-resend-dev-domain
- Direcciones de prueba que no dañan reputación: `delivered@resend.dev`, `bounced@resend.dev`, `complained@resend.dev`. https://resend.com/docs/knowledge-base/what-email-addresses-to-use-for-testing
- Plan gratuito: **100 correos/día y 3.000/mes** (transaccional); el día es UTC; cada destinatario To/CC/BCC cuenta como un correo; al pasarse: 429 `daily_quota_exceeded`/`monthly_quota_exceeded`. [VERIFICADO-RESUMEN] https://resend.com/docs/knowledge-base/account-quotas-and-limits
- Ejemplo mínimo (patrón de la guía de Next.js; código no copiado literalmente de la doc) https://resend.com/docs/send-with-nextjs:

```ts
// app/api/alert-email/route.ts
import { Resend } from "resend"; // npm i resend
export const runtime = "nodejs";
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST() {
  const { data, error } = await resend.emails.send({
    from: "Copiloto <onboarding@resend.dev>",
    to: [process.env.DEMO_TO_EMAIL!], // must be the Resend account owner's email
    subject: "Aviso de saldo",
    html: "<p>Tu saldo proyectado cae por debajo de 0 el 28 de noviembre.</p>",
  });
  if (error) return Response.json({ error: "send_failed" }, { status: 502 });
  return Response.json({ id: data?.id });
}
```

---

## 5. Supabase

- Plan gratuito: **2 proyectos activos**; un proyecto gratis se **pausa por poca actividad en la base durante ~una semana** (los pausados no cuentan para el límite; los de pago no se pausan). 500 MB de base, 50.000 MAU y 5 GB de ancho de banda son cifras de terceros [TERCEROS; confirmar]. https://supabase.com/docs/guides/platform/free-project-pausing · https://supabase.com/pricing · https://supabase.com/kb/faqs/platform/free-project-pausing
  - Consecuencia para la demo: haz una consulta a la base **el día de la demo por la mañana**; restaurar un proyecto pausado quita tiempo y puede romper claves antiguas.
- Claves actuales: **publishable `sb_publishable_...`** (sustituye a `anon`; navegador) y **secret `sb_secret_...`** (sustituye a `service_role`; solo servidor, salta RLS). Las legacy `anon`/`service_role` se deprecan a fin de 2026 pero siguen funcionando. [VERIFICADO-RESUMEN] https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys
- Variables en Next.js App Router: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (la guía oficial ya no usa `..._ANON_KEY`). Nombre de la variable para la clave secret en tu `.env`: libre (p. ej. `SUPABASE_SECRET_KEY`), [no hay nombre oficial confirmado]. https://supabase.com/docs/guides/auth/server-side/nextjs?router=app
- En Next.js 16 el antiguo `middleware` pasó a llamarse `proxy` (ahí va el refresco de sesión de Supabase) [TERCEROS: issoh.co.jp]; la guía oficial tiene la sección «Hook up proxy».
- Si no hay login real (datos sintéticos), puedes saltarte `@supabase/ssr` y usar `@supabase/supabase-js` en rutas del servidor con la clave secret.

```ts
// lib/supabase/server.ts   (npm i @supabase/ssr @supabase/supabase-js)
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies(); // async in current Next.js
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    }
  );
}
```

(La forma `getAll/setAll` es la actual según la guía oficial de SSR [VERIFICADO-RESUMEN solo en parte]: confirma contra https://supabase.com/docs/guides/auth/server-side/creating-a-client.)

---

## 6. Vercel

- Duración máxima de funciones en Hobby: la tabla oficial vigente muestra **300 s por defecto y máximo 300 s** con Fluid Compute (habilitado por defecto); páginas antiguas decían 10 s/60 s y están obsoletas. [VERIFICADO-RESUMEN] https://vercel.com/docs/functions/limitations · https://vercel.com/changelog/higher-defaults-and-limits-for-vercel-functions-running-fluid-compute · https://vercel.com/docs/functions/configuring-functions/duration
- Tamaño de cuerpo de petición/respuesta de una función: **4,5 MB** (si no, 413 `FUNCTION_PAYLOAD_TOO_LARGE`). Cuidado con subir audios largos a `/api/stt`: frases de segundos pesan KB, está bien. https://vercel.com/docs/functions/limitations · https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions
- Streaming de respuestas: no se encontró un límite separado en lo consultado [SIN VERIFICAR]; el runtime Node con `Response(upstream.body)` es el patrón usado en 1.6.
- Variables de entorno con la CLI (https://vercel.com/docs/cli/env):

```bash
vercel link
vercel env add FISH_API_KEY production      # prompts for the value (not echoed into history)
vercel env add FISH_API_KEY preview
vercel env add FISH_VOICE_ID production
vercel env add RESEND_API_KEY production
vercel env add VAPID_PRIVATE_KEY production
vercel env pull .env.local                  # writes Development vars; keep .env.local out of git
```

  `vercel env pull` sobrescribe el archivo; tras cambiar variables hay que redesplegar para que las funciones las vean [ASUMIDO]. Las variables `NEXT_PUBLIC_*` se incrustan en el build.

---

## Trampas conocidas

1. `fish-audio-sdk` en npm NO es el oficial; el oficial es `fish-audio` (0.1.0, inmaduro, defecto `s1`, tipos sin `s2.1`). Usa `fetch`.
2. `s1` se retira el 31-dic-2026; no lo uses. `s2.1-pro-free` podría ser temporal (tercero): probarlo hoy.
3. Fish: la cabecera `model` aparece como opcional en el OpenAPI pero obligatoria en una página de prosa: envíala siempre. `chunk_length` por defecto: 200 o 300 según la fuente.
4. Fish devuelve **429 sin `Retry-After`** y la concurrencia es baja (5 simultáneas al inicio, tercero): un audio a la vez y reintento.
5. La clave de Fish nunca al navegador; todo por `/api/tts`. No imprimas cabeceras ni errores del proveedor.
6. iPhone: el audio exige gesto del usuario para empezar a sonar; iOS Safari no graba WebM en versiones antiguas (usa `isTypeSupported`).
7. Push en iPhone: solo desde el icono de pantalla de inicio, permiso por toque, y solo HTTPS desplegado. Prueba en un iPhone real esta noche; no el día de la demo.
8. Resend sin dominio: solo llega al correo dueño de la cuenta Resend. Para el jurado/compañeros, o verificas un dominio o usas push.
9. Supabase gratis se pausa tras ~1 semana sin actividad y las claves legacy se deprecan: usa `sb_publishable`/`sb_secret` y toca la base antes de la demo.
10. Vercel: cuerpo máximo 4,5 MB; documentos viejos que dicen 10 s de duración están obsoletos.
11. Sin WebSocket en Vercel como servidor: el streaming en vivo de Fish por WS desde el navegador expondría la clave; no lo hagas.
12. Todo número de dinero lo calcula el código; la voz solo lee el texto que ya contiene esas cifras (regla del proyecto).
