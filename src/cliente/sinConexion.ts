/** Registra el service worker y le pasa los archivos que ya usó la página, para que la app abra sin internet. */
export function prepararSinConexion(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
  void navigator.serviceWorker
    .register("/sw.js", { scope: "/", updateViaCache: "none" })
    .then(() => navigator.serviceWorker.ready)
    .then(registro => {
      const rutas = performance
        .getEntriesByType("resource")
        .map(e => new URL(e.name, window.location.href))
        .filter(u => u.origin === window.location.origin && u.pathname.startsWith("/_next/static/"))
        .map(u => u.pathname + u.search);
      registro.active?.postMessage({ tipo: "guardar", rutas: [...new Set([window.location.pathname, ...rutas])] });
    })
    .catch(() => undefined);
}
