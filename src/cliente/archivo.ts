import { salidasPermitidas } from "./salidas";
import { Extraccion } from "@/documentos/esquema";

export const TIPOS_ACEPTADOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export const MAXIMO_BYTES = 3 * 1024 * 1024;
const LADO_MAXIMO = 1600;

export interface ArchivoListo {
  nombre: string;
  tipo: string;
  datosBase64: string;
}

export class ErrorArchivo extends Error {}

/** Mensaje en español para cada respuesta de error del servidor. */
export function mensajeDeEstado(estado: number, mensaje?: string): string {
  if (mensaje) return mensaje;
  if (estado === 401) return "Tu sesión terminó. Vuelve a entrar y prueba otra vez.";
  if (estado === 413) return "El archivo es demasiado grande. Sube uno de menos de 3 MB.";
  if (estado === 415) return "Ese tipo de archivo no se puede leer. Usa una foto (JPG, PNG, WebP) o un PDF.";
  if (estado === 429) return "Hiciste muchos intentos seguidos. Espera un minuto y vuelve a probar.";
  if (estado === 503) return "El análisis con IA no está disponible ahora. Puedes usar el reporte de ejemplo.";
  return "No pude analizar el documento ahora. Inténtalo de nuevo en un momento.";
}

function aBase64(bytes: Uint8Array): string {
  let texto = "";
  for (let i = 0; i < bytes.length; i += 0x8000) texto += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(texto);
}

async function reducirImagen(archivo: File): Promise<{ bytes: Uint8Array; tipo: string }> {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.max(1, Math.round(bitmap.width * escala));
  lienzo.height = Math.max(1, Math.round(bitmap.height * escala));
  lienzo.getContext("2d")?.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>(ok => lienzo.toBlob(ok, "image/jpeg", 0.85));
  if (!blob) throw new ErrorArchivo("No pude preparar la foto. Prueba con otra.");
  return { bytes: new Uint8Array(await blob.arrayBuffer()), tipo: "image/jpeg" };
}

/** Valida tipo y tamaño, reduce las fotos grandes y devuelve el archivo en base64 listo para enviar. */
export async function prepararArchivo(archivo: File): Promise<ArchivoListo> {
  if (!(TIPOS_ACEPTADOS as readonly string[]).includes(archivo.type))
    throw new ErrorArchivo("Ese tipo de archivo no se puede leer. Usa una foto (JPG, PNG, WebP) o un PDF.");
  if (archivo.type === "application/pdf") {
    if (archivo.size > MAXIMO_BYTES) throw new ErrorArchivo("El PDF pesa más de 3 MB. Sube uno más liviano o una foto de la página.");
    return { nombre: archivo.name, tipo: archivo.type, datosBase64: aBase64(new Uint8Array(await archivo.arrayBuffer())) };
  }
  let imagen;
  try {
    imagen = await reducirImagen(archivo);
  } catch (e) {
    if (e instanceof ErrorArchivo) throw e;
    throw new ErrorArchivo("No pude abrir esa imagen. Prueba con otra foto.");
  }
  if (imagen.bytes.length > MAXIMO_BYTES) throw new ErrorArchivo("La foto sigue siendo muy pesada. Prueba con una captura de pantalla.");
  return { nombre: archivo.name, tipo: imagen.tipo, datosBase64: aBase64(imagen.bytes) };
}

/**
 * Envía el archivo a /api/documento y valida la respuesta con el mismo esquema del servidor.
 * Dos candados antes de que salga un solo byte: IA y voz permitidas en este caso, y la declaración de la
 * persona de que el documento es inventado. El servidor repite el segundo.
 */
export async function analizarDocumento(archivo: ArchivoListo, inventado: boolean, senal?: AbortSignal): Promise<Extraccion> {
  if (!salidasPermitidas()) {
    throw new ErrorArchivo("Para leer un archivo primero activa IA y voz en el asistente. Mientras tanto no sale nada de este equipo: usa el reporte de ejemplo.");
  }
  if (inventado !== true) {
    throw new ErrorArchivo("Confirma primero que el documento es inventado. No se leen documentos con datos reales.");
  }
  let respuesta: Response;
  try {
    respuesta = await fetch("/api/documento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...archivo, inventado: true }),
      signal: senal,
    });
  } catch {
    throw new ErrorArchivo("No hay conexión con el servidor. Revisa tu internet o usa el reporte de ejemplo.");
  }
  if (!respuesta.ok) {
    const cuerpo = (await respuesta.json().catch(() => null)) as { mensaje?: string } | null;
    throw new ErrorArchivo(mensajeDeEstado(respuesta.status, cuerpo?.mensaje));
  }
  const datos = Extraccion.safeParse(await respuesta.json().catch(() => null));
  if (!datos.success) throw new ErrorArchivo("La respuesta del análisis llegó incompleta. Inténtalo otra vez.");
  return datos.data;
}
