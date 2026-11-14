import { z } from "zod";
import { extraerDocumento } from "@/documentos/extraer";
import { MAXIMO_CUERPO_BYTES, validarArchivo } from "@/documentos/validar";
import { claveAnthropic } from "@/servidor/entorno";
import { errorJson, mismoOrigen, visitante } from "@/servidor/http";
import { crearLimite } from "@/servidor/limite";
import { registrarFallo } from "@/servidor/registro";
import { haySesion, sinSesion } from "@/servidor/sesion";

export const runtime = "nodejs";
export const maxDuration = 60;

const limite = crearLimite(6, 60_000);
// Tope para todos los visitantes juntos: acota el gasto de la clave si alguien rota direcciones.
const topeGlobal = crearLimite(120, 3_600_000);

const Peticion = z.object({
  nombre: z.string().max(200).optional(),
  tipo: z.string().max(100),
  datosBase64: z.string().min(1),
});

/** Error con código corto y mensaje en español para la persona. Nunca datos del documento ni del proveedor. */
function fallo(error: string, mensaje: string, estado: number): Response {
  return Response.json({ error, mensaje }, { status: estado, headers: { "Cache-Control": "no-store" } });
}

type Cuerpo = { ok: true; datos: unknown } | { ok: false; respuesta: Response };

async function leerCuerpo(req: Request): Promise<Cuerpo> {
  const demasiado = fallo("archivo_muy_grande", "El archivo es demasiado grande. Sube uno de menos de 3 MB.", 413);
  const declarado = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declarado) && declarado > MAXIMO_CUERPO_BYTES) return { ok: false, respuesta: demasiado };
  try {
    const texto = await req.text();
    if (texto.length > MAXIMO_CUERPO_BYTES) return { ok: false, respuesta: demasiado };
    return { ok: true, datos: JSON.parse(texto) as unknown };
  } catch {
    return { ok: false, respuesta: fallo("peticion_invalida", "No pude leer la petición.", 400) };
  }
}

/**
 * Lee un documento (foto o PDF) y devuelve la extracción estructurada.
 * Petición: JSON `{ nombre?, tipo, datosBase64 }`. Respuesta 200: `Extraccion`. Errores: `{ error, mensaje }`.
 */
export async function POST(req: Request): Promise<Response> {
  if (!mismoOrigen(req)) return errorJson("origen_no_permitido", 403);
  if (!haySesion(req)) return sinSesion();
  if (!limite.permite(visitante(req)) || !topeGlobal.permite("todos"))
    return errorJson("demasiadas_peticiones", 429);

  const cuerpo = await leerCuerpo(req);
  if (!cuerpo.ok) return cuerpo.respuesta;
  const peticion = Peticion.safeParse(cuerpo.datos);
  if (!peticion.success) return fallo("peticion_invalida", "Falta el archivo o su tipo.", 400);
  const archivo = validarArchivo(peticion.data.tipo, peticion.data.datosBase64);
  if (!archivo.ok) return fallo(archivo.error, archivo.mensaje, archivo.estado);

  const clave = claveAnthropic();
  if (!clave) {
    return fallo(
      "sin-ia",
      "El análisis con IA no está disponible ahora. Puedes usar el reporte SBS de ejemplo.",
      503,
    );
  }

  try {
    const extraccion = await extraerDocumento(clave, { tipo: archivo.tipo, base64: archivo.base64 }, req.signal);
    if (!extraccion) {
      return fallo("no-entendi", "No logré entender el documento. Prueba con una foto más nítida o el PDF original.", 502);
    }
    return Response.json(extraccion, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (req.signal.aborted) return fallo("cancelado", "Se canceló el análisis.", 499);
    registrarFallo("documento", error);
    return fallo("ia_fallo", "No pude analizar el documento ahora. Inténtalo de nuevo en un momento.", 502);
  }
}
