// Service worker: recibe el aviso y lo muestra (al tocarlo, abre la app) y guarda lo necesario
// para que la app abra sin conexión tras la primera visita. No toca /api ni guarda datos personales.
const CACHE = "copiloto-sin-conexion-v1";
const TOPE = 160;
const PAGINAS = ["/", "/ingresar"];
const FIJOS = ["/icono-192.png", "/icono-512.png", "/apple-touch-icon.png", "/manifest.webmanifest"];

const esEstatico = (ruta) => ruta.startsWith("/_next/static/") || FIJOS.includes(ruta);

async function recortar(cache) {
  const claves = await cache.keys();
  for (const clave of claves.slice(0, Math.max(0, claves.length - TOPE))) await cache.delete(clave);
}

async function guardar(cache, clave, respuesta) {
  if (!respuesta.ok || respuesta.redirected || respuesta.type !== "basic") return;
  await cache.put(clave, respuesta.clone());
  await recortar(cache);
}

async function estatico(request) {
  const cache = await caches.open(CACHE);
  const guardado = await cache.match(request);
  if (guardado) return guardado;
  const respuesta = await fetch(request);
  await guardar(cache, request, respuesta);
  return respuesta;
}

async function pagina(request, ruta) {
  const cache = await caches.open(CACHE);
  try {
    const respuesta = await fetch(request);
    await guardar(cache, ruta, respuesta);
    return respuesta;
  } catch (error) {
    const guardado = await cache.match(ruta);
    if (guardado) return guardado;
    throw error;
  }
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (evento) =>
  evento.waitUntil(
    (async () => {
      for (const nombre of await caches.keys()) if (nombre !== CACHE) await caches.delete(nombre);
      await self.clients.claim();
    })(),
  ),
);

self.addEventListener("fetch", (evento) => {
  const { request } = evento;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (esEstatico(url.pathname)) evento.respondWith(estatico(request));
  else if (request.mode === "navigate" && PAGINAS.includes(url.pathname)) evento.respondWith(pagina(request, url.pathname));
});

// La página avisa qué archivos usó (incluidos los de la base local, que se piden tarde) para guardarlos ya.
self.addEventListener("message", (evento) => {
  const datos = evento.data;
  if (!datos || datos.tipo !== "guardar" || !Array.isArray(datos.rutas)) return;
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      for (const ruta of datos.rutas.slice(0, 200)) {
        if (typeof ruta !== "string") continue;
        let url;
        try {
          url = new URL(ruta, self.location.origin);
        } catch {
          continue;
        }
        if (url.origin !== self.location.origin) continue;
        const clave = url.pathname + url.search;
        try {
          if (esEstatico(url.pathname)) {
            if (!(await cache.match(clave))) await guardar(cache, clave, await fetch(clave));
          } else if (PAGINAS.includes(url.pathname)) {
            await guardar(cache, url.pathname, await fetch(url.pathname, { credentials: "same-origin" }));
          }
        } catch {
          // sin red: se intentará en la próxima visita
        }
      }
    })(),
  );
});

self.addEventListener("push", (evento) => {
  let datos = {};
  try {
    datos = evento.data ? evento.data.json() : {};
  } catch {
    datos = {};
  }
  const titulo = typeof datos.title === "string" ? datos.title : "Copiloto anticipador";
  evento.waitUntil(
    self.registration.showNotification(titulo, {
      body: typeof datos.body === "string" ? datos.body : "",
      icon: "/icono-192.png",
      badge: "/icono-192.png",
      tag: "copiloto-aviso",
      data: { url: "/" },
    }),
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((v) => "focus" in v);
      return abierta ? abierta.focus() : self.clients.openWindow("/");
    }),
  );
});
