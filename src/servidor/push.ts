/**
 * Solo se envían avisos a los servicios de notificaciones de los navegadores conocidos.
 * Así nadie puede usar esta ruta para que el servidor llame a una dirección cualquiera.
 */
const SERVICIOS_EXACTOS = ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"];
const SERVICIOS_POR_SUFIJO = [".push.apple.com", ".notify.windows.com", ".push.services.mozilla.com"];

export function esServicioDePush(direccion: string): boolean {
  let url: URL;
  try {
    url = new URL(direccion);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
  const anfitrion = url.hostname.toLowerCase();
  return SERVICIOS_EXACTOS.includes(anfitrion) || SERVICIOS_POR_SUFIJO.some(sufijo => anfitrion.endsWith(sufijo));
}
