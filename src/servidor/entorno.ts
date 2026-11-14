/**
 * Único punto donde el servidor lee sus variables de entorno.
 * Los valores solo salen de aquí hacia quien llama al proveedor; nunca se registran ni se devuelven al navegador.
 */
function leer(nombre: string): string | undefined {
  const valor = process.env[nombre]?.trim();
  return valor ? valor : undefined;
}

export const MODELO_IA_POR_DEFECTO = "claude-opus-5-5";
export const MODELO_VOZ_POR_DEFECTO = "s2.1-pro";

export function claveAnthropic(): string | undefined {
  return leer("ANTHROPIC_API_KEY");
}

export function modeloAnthropic(): string {
  return leer("ANTHROPIC_MODEL") ?? MODELO_IA_POR_DEFECTO;
}

/** Modelo para las preguntas que piden un análisis (un plan, comparar escenarios): el más capaz. */
export const MODELO_IA_PROFUNDO_POR_DEFECTO = "claude-fable-5-2";

/** Ponerle el mismo valor que ANTHROPIC_MODEL apaga el cambio de modelo. */
export function modeloProfundo(): string {
  return leer("ANTHROPIC_MODEL_PROFUNDO") ?? MODELO_IA_PROFUNDO_POR_DEFECTO;
}

/** Clave de Fish Audio; basta para transcribir. */
export function claveFish(): string | undefined {
  return leer("FISH_API_KEY");
}

export interface ConfigVoz {
  clave: string;
  voz: string;
  modelo: string;
}

/** Para hablar hacen falta la clave y el id de una voz. */
export function configVoz(): ConfigVoz | undefined {
  const clave = claveFish();
  const voz = leer("FISH_VOICE_ID");
  if (!clave || !voz) return undefined;
  return { clave, voz, modelo: leer("FISH_MODEL") ?? MODELO_VOZ_POR_DEFECTO };
}

export interface ConfigPush {
  publica: string;
  privada: string;
  asunto: string;
}

export function configPush(): ConfigPush | undefined {
  const publica = leer("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  const privada = leer("VAPID_PRIVATE_KEY");
  const asunto = leer("VAPID_SUBJECT");
  if (!publica || !privada || !asunto) return undefined;
  return { publica, privada, asunto };
}

/**
 * Lectura de documentos con IA: APAGADA por defecto. El prototipo trabaja solo con el reporte de ejemplo
 * (datos sintéticos, lectura precargada). Solo se enciende poniendo LECTURA_DOCUMENTOS=1 en el servidor.
 */
export function lecturaDocumentos(): boolean {
  return leer("LECTURA_DOCUMENTOS") === "1";
}

export interface EstadoServicios {
  ia: boolean;
  voz: boolean;
  push: boolean;
  documentos: boolean;
}

/** Qué piezas externas están configuradas. Solo verdadero/falso: ningún valor. */
export function estadoServicios(): EstadoServicios {
  return {
    ia: Boolean(claveAnthropic()),
    voz: Boolean(configVoz()),
    push: Boolean(configPush()),
    documentos: Boolean(claveAnthropic()) && lecturaDocumentos(),
  };
}
