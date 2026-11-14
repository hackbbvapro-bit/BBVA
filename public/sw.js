// Service worker mínimo: recibe el aviso y lo muestra; al tocarlo, abre la app.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (evento) => evento.waitUntil(self.clients.claim()));

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
