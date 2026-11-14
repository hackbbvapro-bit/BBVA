/** Validación del archivo subido. El cuerpo llega como JSON { nombre?, tipo, datosBase64 } (más simple que multipart y fácil de probar). */

export const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export type TipoPermitido = (typeof TIPOS_PERMITIDOS)[number];

export const MAXIMO_ARCHIVO_BYTES = 3 * 1024 * 1024;
/** Tope del cuerpo JSON completo: 3 MB en base64 son ~4,2 MB; Vercel corta el cuerpo a 4,5 MB. */
export const MAXIMO_CUERPO_BYTES = 4_400_000;

export type ResultadoArchivo =
  | { ok: true; tipo: TipoPermitido; base64: string; bytes: number }
  | { ok: false; estado: 400 | 413 | 415; error: string; mensaje: string };

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

const falla = (estado: 400 | 413 | 415, error: string, mensaje: string): ResultadoArchivo => ({
  ok: false,
  estado,
  error,
  mensaje,
});

function esTipoPermitido(tipo: string): tipo is TipoPermitido {
  return (TIPOS_PERMITIDOS as readonly string[]).includes(tipo);
}

/** ¿Los primeros bytes son los de ese formato? (JPEG FFD8FF, PNG 89504E47, WEBP RIFF....WEBP, PDF %PDF). */
export function firmaCoincide(tipo: TipoPermitido, b: Uint8Array): boolean {
  const ascii = (desde: number, texto: string) => [...texto].every((c, i) => b[desde + i] === c.charCodeAt(0));
  switch (tipo) {
    case "image/jpeg":
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case "image/png":
      return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
    case "image/webp":
      return ascii(0, "RIFF") && ascii(8, "WEBP");
    case "application/pdf":
      return ascii(0, "%PDF");
  }
}

/** Valida tipo declarado, tamaño real del archivo decodificado y firma mágica. */
export function validarArchivo(tipo: string, datosBase64: string): ResultadoArchivo {
  if (!esTipoPermitido(tipo)) {
    return falla(415, "tipo_no_permitido", "Solo se aceptan fotos JPG, PNG o WEBP, o archivos PDF.");
  }
  const limpio = datosBase64.trim();
  if (limpio.length === 0 || limpio.length % 4 !== 0 || !BASE64.test(limpio)) {
    return falla(400, "archivo_invalido", "No pude leer el archivo. Vuelve a subirlo.");
  }
  const relleno = limpio.endsWith("==") ? 2 : limpio.endsWith("=") ? 1 : 0;
  const bytes = (limpio.length / 4) * 3 - relleno;
  if (bytes > MAXIMO_ARCHIVO_BYTES) {
    return falla(413, "archivo_muy_grande", "El archivo pesa más de 3 MB. Sube uno más liviano.");
  }
  if (!firmaCoincide(tipo, Buffer.from(limpio, "base64"))) {
    return falla(400, "firma_no_coincide", "El contenido del archivo no coincide con su tipo. Sube una foto o PDF real.");
  }
  return { ok: true, tipo, base64: limpio, bytes };
}
