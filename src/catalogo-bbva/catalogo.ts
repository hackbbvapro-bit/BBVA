/**
 * Catálogo de productos de BBVA Perú para personas naturales, copiado de la web oficial (bbva.pe y fondos.bbva.pe)
 * con su fecha de consulta. Es lo único que el asistente puede citar sobre productos de BBVA: nombres, tasas, costos y
 * requisitos salen tal cual de aquí, con su enlace. Nada se calcula ni se completa: si la web no publica una cifra, no hay.
 */
import { z } from "zod";
import datos from "./productos.json";
import { REGLAS_ORIENTACION, avisosDe, encajeDe, paraTuSituacion, type Senal, type SenalDetectada } from "./orientacion";

export const FAMILIAS = ["cuentas", "tarjetas_credito", "prestamos", "vivienda_y_auto", "inversiones", "seguros", "servicios"] as const;
export type Familia = (typeof FAMILIAS)[number];

export const TITULO_FAMILIA: Record<Familia, string> = {
  cuentas: "Cuentas y depósitos (para guardar)",
  tarjetas_credito: "Tarjetas de crédito (para financiarte)",
  prestamos: "Préstamos personales (para financiarte)",
  vivienda_y_auto: "Créditos de vivienda y auto",
  inversiones: "Fondos mutuos e inversiones (para hacer crecer)",
  seguros: "Seguros (para protegerte)",
  servicios: "Servicios y canales digitales",
};

const URL_OFICIAL = /^https:\/\/(www\.bbva\.pe|fondos\.bbva\.pe)\//;
const texto = z.string().trim().min(1);

const Producto = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  nombre: texto,
  familia: z.enum(FAMILIAS),
  subfamilia: texto,
  para_que_sirve: texto,
  para_quien: z.string().trim(),
  beneficios: z.array(texto),
  requisitos: z.array(texto),
  cifras_oficiales: z.array(texto),
  sin_cifras_publicadas: z.boolean(),
  moneda: z.array(z.enum(["PEN", "USD"])),
  url_oficial: z.string().url().regex(URL_OFICIAL, "Solo páginas oficiales de BBVA Perú"),
  estado: z.enum(["vigente", "renombrado", "no_encontrado"]),
  notas: z.string(),
}).refine(p => p.sin_cifras_publicadas === (p.cifras_oficiales.length === 0), {
  message: "sin_cifras_publicadas debe coincidir con que no haya cifras",
});
export type ProductoBbva = z.infer<typeof Producto>;

const Catalogo = z.object({
  fecha_consulta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fuente: texto,
  aviso: texto,
  productos: z.array(Producto).min(1),
}).refine(c => new Set(c.productos.map(p => p.id)).size === c.productos.length, { message: "id repetido" });
export type CatalogoBbva = z.infer<typeof Catalogo>;

/** Se valida al cargar: un dato mal copiado rompe las pruebas, no la conversación. */
export const CATALOGO_BBVA: CatalogoBbva = Catalogo.parse(datos);

/** Lo que se puede ofrecer: lo que la web ya no publica no se menciona. */
const vigentes = (c: CatalogoBbva) => c.productos.filter(p => p.estado !== "no_encontrado");

function normalizar(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9%]+/g, " ").trim();
}

const VACIAS = new Set([
  "que", "cual", "cuales", "para", "con", "sin", "una", "uno", "unos", "unas", "los", "las", "del", "por", "como", "mas",
  "tiene", "tienen", "tienes", "hay", "quiero", "busco", "necesito", "me", "mi", "mis", "conviene", "bbva", "banco",
  "producto", "productos", "dame", "lista", "listame", "todos", "todas", "sus", "algo", "sobre", "cuanto", "cuesta",
]);

/** Palabras de la calle → palabras del catálogo. */
const SINONIMOS: Record<string, string[]> = {
  tarjeta: ["tarjetas", "credito"],
  tarjetas: ["tarjeta", "credito"],
  ahorrar: ["ahorro", "cuenta"],
  ahorro: ["ahorrar", "cuenta"],
  casa: ["vivienda", "hipotecario"],
  depa: ["vivienda", "hipotecario"],
  departamento: ["vivienda", "hipotecario"],
  carro: ["vehicular", "auto"],
  auto: ["vehicular"],
  invertir: ["fondo", "inversion"],
  plata: ["dinero"],
  prestamo: ["prestamos", "credito"],
  prestamos: ["prestamo", "credito"],
  seguro: ["seguros"],
  viaje: ["viajes", "millas"],
  viajar: ["viajes", "viaje", "millas"],
  estudiar: ["estudios"],
  universidad: ["estudios"],
};

/** Palabras de la consulta con su peso: las que escribió la persona valen entero; los sinónimos, menos. */
function terminos(consulta: string): [string, number][] {
  const base = [...new Set(normalizar(consulta).split(" ").filter(w => w.length >= 3 && !VACIAS.has(w)))];
  const pesos = new Map<string, number>(base.map(w => [w, 1]));
  for (const w of base) for (const s of SINONIMOS[w] ?? []) if (!pesos.has(s)) pesos.set(s, 0.4);
  return [...pesos];
}

function puntaje(p: ProductoBbva, palabras: [string, number][]): number {
  const nombre = ` ${normalizar(`${p.nombre} ${p.id}`)} `;
  const sub = ` ${normalizar(`${p.subfamilia} ${p.familia}`)} `;
  const resumen = ` ${normalizar(p.para_que_sirve)} `;
  const cuerpo = ` ${normalizar([p.para_quien, ...p.beneficios, ...p.requisitos, ...p.cifras_oficiales].join(" "))} `;
  let total = 0;
  for (const [w, peso] of palabras) {
    let n = 0;
    if (nombre.includes(` ${w}`)) n += 5;
    if (sub.includes(w)) n += 3;
    if (resumen.includes(` ${w}`)) n += 2;
    if (cuerpo.includes(` ${w}`)) n += 1;
    total += n * peso;
  }
  return total;
}

export const MAX_RESULTADOS = 4;

/** Ficha tal como la recibe el asistente: los textos oficiales sin tocar, y sin cifras inventadas cuando no hay. */
function ficha(p: ProductoBbva, senales: ReadonlySet<Senal> = new Set()) {
  const avisos = avisosDe(p);
  return {
    nombre: p.nombre,
    tipo: TITULO_FAMILIA[p.familia],
    para_que_sirve: p.para_que_sirve,
    para_quien: p.para_quien,
    beneficios: p.beneficios,
    requisitos: p.requisitos,
    cifras_oficiales: p.sin_cifras_publicadas ? "La web oficial no publica tasas ni costos de este producto: hay que cotizarlo en bbva.pe o en una agencia." : p.cifras_oficiales,
    moneda: p.moneda,
    enlace_oficial: p.url_oficial,
    ...(p.notas ? { ojo: p.notas } : {}),
    ...encajeDe(p, senales),
    ...(avisos.length ? { avisos } : {}),
  };
}

/** Lo que el motor sabe de la persona, para cruzarlo con el criterio de cada producto. Opcional: sin ella, solo fichas. */
export interface SituacionPersona {
  senales: readonly SenalDetectada[];
}

const conjunto = (s?: SituacionPersona): ReadonlySet<Senal> => new Set(s?.senales.map(x => x.senal) ?? []);

const encabezado = (c: CatalogoBbva, s?: SituacionPersona) => ({
  fuente: c.fuente,
  consultado_el: c.fecha_consulta,
  aviso: c.aviso,
  ...(s ? { tu_situacion: s.senales, reglas: REGLAS_ORIENTACION } : {}),
});

/** Sin consulta: el menú completo por familia (solo nombres y para qué sirven), para «¿qué productos tienen?». */
export function menuDelCatalogo(familia?: Familia, c: CatalogoBbva = CATALOGO_BBVA, situacion?: SituacionPersona) {
  const sugeridos = situacion ? paraTuSituacion(vigentes(c).filter(p => !familia || p.familia === familia), conjunto(situacion)) : [];
  const familias = (familia ? [familia] : FAMILIAS).map(f => ({
    familia: TITULO_FAMILIA[f],
    productos: vigentes(c).filter(p => p.familia === f).map(p => ({ nombre: p.nombre, para_que_sirve: p.para_que_sirve })),
  })).filter(f => f.productos.length > 0);
  return {
    ...encabezado(c, situacion),
    ...(situacion ? { para_tu_situacion: sugeridos } : {}),
    total_productos: familias.reduce((n, f) => n + f.productos.length, 0),
    familias,
  };
}

/** Con consulta: las fichas que mejor encajan, completas. Si nada encaja, lo dice y ofrece el menú. */
export function buscarEnCatalogo(consulta: string, familia?: Familia, c: CatalogoBbva = CATALOGO_BBVA, situacion?: SituacionPersona) {
  const senales = conjunto(situacion);
  const palabras = terminos(consulta);
  const candidatos = vigentes(c).filter(p => !familia || p.familia === familia);
  const encontrados = candidatos
    .map(p => ({ p, n: puntaje(p, palabras) }))
    .filter(x => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, MAX_RESULTADOS)
    .map(x => ficha(x.p, senales));
  if (encontrados.length === 0) {
    return { ...encabezado(c, situacion), encontrados: [], nota: "Nada del catálogo encaja con esa búsqueda. Muestra el menú (llama sin consulta) o pregunta qué necesita." };
  }
  return { ...encabezado(c, situacion), encontrados };
}
