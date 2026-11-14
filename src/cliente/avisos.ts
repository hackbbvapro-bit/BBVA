/**
 * Notificaciones en el celular. No se guarda nada en ningún servidor:
 * la suscripción vive en el navegador y se manda solo al pedir un aviso.
 */
import { salidasPermitidas } from "./salidas";

export type EstadoAvisos =
  | "no_soportado"    // este navegador no puede recibir avisos
  | "falta_instalar"  // iPhone: primero «Compartir → Añadir a pantalla de inicio»
  | "sin_permiso"     // todavía no se ha pedido permiso
  | "denegado"        // la persona dijo que no (se cambia en los ajustes del celular)
  | "activo";

export type ResultadoAviso = "enviado" | "local" | "fallo";

const CLAVE_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function esIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.userAgent.includes("Mac") && navigator.maxTouchPoints > 1);
}

export function estaInstalada(): boolean {
  if (typeof window === "undefined") return false;
  const enIOS = (navigator as unknown as { standalone?: boolean }).standalone === true;
  return enIOS || window.matchMedia("(display-mode: standalone)").matches;
}

function soportado(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "Notification" in window;
}

export function estadoAvisos(): EstadoAvisos {
  if (typeof window === "undefined") return "no_soportado";
  if (esIOS() && !estaInstalada()) return "falta_instalar";
  if (!soportado()) return "no_soportado";
  if (Notification.permission === "denied") return "denegado";
  return Notification.permission === "granted" ? "activo" : "sin_permiso";
}

function claveComoBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const binario = atob((base64Url + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(binario.length));
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

async function registro(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  return navigator.serviceWorker.ready;
}

async function suscripcion(reg: ServiceWorkerRegistration): Promise<PushSubscription | undefined> {
  if (!CLAVE_PUBLICA || !("pushManager" in reg)) return undefined;
  try {
    return (await reg.pushManager.getSubscription())
      ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveComoBytes(CLAVE_PUBLICA) }));
  } catch {
    return undefined;
  }
}

/** Pide permiso y deja el celular listo. Debe llamarse dentro de un toque del usuario. */
export async function activarAvisos(): Promise<EstadoAvisos> {
  const antes = estadoAvisos();
  if (antes !== "sin_permiso" && antes !== "activo") return antes;
  try {
    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") return permiso === "denied" ? "denegado" : "sin_permiso";
    // En el caso de práctica el permiso sirve solo para avisos locales: no se crea suscripción remota.
    const reg = await registro();
    if (salidasPermitidas()) await suscripcion(reg);
    return "activo";
  } catch {
    return "no_soportado";
  }
}

/**
 * Manda al celular el aviso principal del perfil.
 * "enviado" = llegó por el servicio de notificaciones (como llegaría con la app cerrada);
 * "local" = lo mostró el propio celular porque el envío remoto no estaba disponible.
 */
export async function enviarAvisoDePrueba(perfilId: string, respaldo: { titulo: string; cuerpo: string }): Promise<ResultadoAviso> {
  if (estadoAvisos() !== "activo") return "fallo";
  try {
    const reg = await registro();
    // Caso de práctica: sin suscripción ni envío al servidor; solo el aviso local.
    const sub = salidasPermitidas() ? await suscripcion(reg) : null;
    if (sub) {
      const respuesta = await fetch("/api/avisos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perfilId, suscripcion: sub.toJSON() }),
      });
      if (respuesta.ok) return "enviado";
    }
    await reg.showNotification(respaldo.titulo, { body: respaldo.cuerpo, icon: "/icono-192.png", tag: "copiloto-aviso" });
    return "local";
  } catch {
    return "fallo";
  }
}
