/**
 * Lo que la persona le cuenta al asistente («me acaban de pagar 1.000», «me van a dar 100 el viernes»,
 * «pago 50 de luz cada mes el 15») convertido en una acción concreta sobre sus datos, con su efecto
 * calculado por el motor (antes → después). Montos y fechas los lee el código; la IA solo decide cuándo
 * llamar a la herramienta y lo explica. Todo aquí es puro: no guarda nada (eso lo hace el navegador).
 */
import { z } from "zod";
import { aDeudaMotor, expandirFijo, pagosDeDeuda } from "../datos/aPerfil";
import { analizar } from "../motor";
import { conCobros, type CobroPendiente } from "../motor/cobros";
import { formatoSoles } from "../motor/dinero";
import { diaSemana, fechaEnMes, formatoCorto, formatoLargo, partes, sumarDias } from "../motor/fechas";
import { LIMITE_MONTO, buscarMonto } from "../motor/numeros";
import type { Categoria, Centimos, FechaISO, Perfil } from "../motor/tipos";

export const CATEGORIAS = [
  "sueldo", "ingreso_variable", "alquiler", "servicios", "suscripciones", "deuda", "comida", "transporte",
  "salud", "educacion", "ocio", "compras", "familia", "otros",
] as const satisfies readonly Categoria[];

const montoPositivo = z.number().int().min(1).max(LIMITE_MONTO);
const fechaValida = z.string().refine(v => {
  try {
    partes(v);
    return true;
  } catch {
    return false;
  }
}, "Fecha no válida");
const nombre = (max: number) => z.string().trim().min(1).max(max).regex(/\p{L}/u, "Necesita al menos una letra");

export const EsquemaAccion = z.discriminatedUnion("tipo", [
  /** Dinero que llegará: se anota como cobro pendiente; el plan prudente no lo cuenta hasta que llegue. */
  z.object({ tipo: z.literal("cobro"), quien: nombre(40), monto: montoPositivo, fecha: fechaValida }),
  /** Algo que ya pasó: entra (+) o sale (−) de la cuenta hoy. */
  z.object({
    tipo: z.literal("saldo"),
    monto: z.number().int().refine(n => n !== 0 && Math.abs(n) <= LIMITE_MONTO, "Monto no válido"),
    descripcion: z.string().trim().min(1).max(60),
  }),
  /** Ingreso o gasto que se repite cada mes. */
  z.object({
    tipo: z.literal("fijo"), sentido: z.enum(["ingreso", "gasto"]), descripcion: nombre(40), monto: montoPositivo,
    dia: z.number().int().min(1).max(31), categoria: z.enum(CATEGORIAS),
  }),
  /** Una deuda con su pago mensual. */
  z.object({
    tipo: z.literal("deuda"), entidad: z.string().trim().min(1).max(40), nombre: nombre(40),
    tipoDeuda: z.enum(["tarjeta", "prestamo", "personal"]), saldo: montoPositivo, pagoMensual: montoPositivo,
    dia: z.number().int().min(1).max(31), tceaBp: z.number().int().min(0).max(100_000).nullable(),
  }),
]);
export type Accion = z.infer<typeof EsquemaAccion>;

export interface Situacion {
  perfil: Perfil;
  /** Cobros pendientes (no cobrados) de la persona. */
  cobros: CobroPendiente[];
}

/** Aplica la acción sobre una copia: el perfil del motor y los cobros quedan como si ya estuviera guardada. */
export function aplicar(accion: Accion, { perfil, cobros }: Situacion): Situacion {
  const ordenar = (m: Perfil["movimientos"]) => [...m].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id));
  const sello = `chat-${perfil.movimientos.length}-${perfil.deudas.length}-${cobros.length}`;
  switch (accion.tipo) {
    case "saldo":
      return { perfil: { ...perfil, saldoActual: perfil.saldoActual + accion.monto }, cobros };
    case "cobro":
      return {
        perfil,
        cobros: [...cobros, { id: `cobro-${sello}`, quien: accion.quien, monto: accion.monto, fechaPrometida: accion.fecha, cobrado: false }],
      };
    case "fijo": {
      const fijo = { id: sello, descripcion: accion.descripcion, monto: accion.monto, dia: accion.dia, categoria: accion.categoria };
      const nuevos = expandirFijo(fijo, accion.sentido === "ingreso" ? 1 : -1, perfil.hoy);
      return { perfil: { ...perfil, movimientos: ordenar([...perfil.movimientos, ...nuevos]) }, cobros };
    }
    case "deuda": {
      const deuda = aDeudaMotor({
        id: sello, entidad: accion.entidad, nombre: accion.nombre, tipo: accion.tipoDeuda, saldo: accion.saldo,
        tceaBp: accion.tceaBp, pagoMinimo: accion.pagoMensual, pagoHabitual: accion.pagoMensual, diaPago: accion.dia,
        diasAtraso: 0, pagada: false,
      });
      return {
        perfil: {
          ...perfil, deudas: [...perfil.deudas, deuda],
          movimientos: ordenar([...perfil.movimientos, ...pagosDeDeuda(deuda, perfil.hoy)]),
        },
        cobros,
      };
    }
  }
}

/** Foto de la situación en los próximos 30 días: sin contar lo que está por llegar y contándolo. */
export interface Foto {
  saldoHoy: Centimos;
  saldoMasBajo: Centimos;
  diaMasBajo: FechaISO;
  enRojoDesde: FechaISO | null;
  faltante: Centimos;
  /** Contando los cobros pendientes, si llegan a tiempo. */
  siTePagan: { saldoMasBajo: Centimos; enRojoDesde: FechaISO | null; faltante: Centimos };
}

export function foto({ perfil, cobros }: Situacion): Foto {
  const { proyeccion } = analizar(perfil);
  const conLoPendiente = conCobros(proyeccion, cobros);
  return {
    saldoHoy: perfil.saldoActual,
    saldoMasBajo: proyeccion.saldoMinimo,
    diaMasBajo: proyeccion.fechaSaldoMinimo,
    enRojoDesde: proyeccion.deficit?.fecha ?? null,
    faltante: proyeccion.deficit?.faltanteMaximo ?? 0,
    siTePagan: {
      saldoMasBajo: conLoPendiente.saldoMinimo,
      enRojoDesde: conLoPendiente.primerDiaNegativo,
      faltante: conLoPendiente.faltanteMaximo,
    },
  };
}

export interface Efecto {
  hoy: FechaISO;
  antes: Foto;
  despues: Foto;
}

export function efectoDe(accion: Accion, situacion: Situacion): Efecto {
  return { hoy: situacion.perfil.hoy, antes: foto(situacion), despues: foto(aplicar(accion, situacion)) };
}

/** Lo mismo que entiende el modelo, en datos (para la herramienta). Sin texto libre. */
export function efectoComoDato(accion: Accion, efecto: Efecto) {
  const f = (x: Foto) => ({
    saldo_hoy: formatoSoles(x.saldoHoy),
    saldo_mas_bajo_30_dias: formatoSoles(x.saldoMasBajo),
    dia_del_saldo_mas_bajo: formatoLargo(x.diaMasBajo),
    quedas_en_rojo_desde: x.enRojoDesde ? formatoLargo(x.enRojoDesde) : null,
    te_faltaria: formatoSoles(x.faltante),
    si_te_pagan_lo_pendiente: {
      saldo_mas_bajo: formatoSoles(x.siTePagan.saldoMasBajo),
      quedas_en_rojo_desde: x.siTePagan.enRojoDesde ? formatoLargo(x.siTePagan.enRojoDesde) : null,
    },
  });
  return { accion: describir(accion), antes: f(efecto.antes), despues: f(efecto.despues) };
}

const soles = (c: Centimos) => formatoSoles(c);
const conSigno = (c: Centimos) => (c >= 0 ? `+${soles(c)}` : `−${soles(-c)}`);

/** Cómo se lee la acción en una línea: «+S/ 1,000.00 (Ingreso extra), hoy». */
export function describir(accion: Accion): string {
  switch (accion.tipo) {
    case "saldo":
      return `${conSigno(accion.monto)} (${accion.descripcion}), hoy`;
    case "cobro":
      return `${soles(accion.monto)} por llegar (${accion.quien}), el ${formatoLargo(accion.fecha)}`;
    case "fijo":
      return `${accion.sentido === "ingreso" ? "ingreso" : "gasto"} fijo «${accion.descripcion}» de ${soles(accion.monto)} cada mes, el día ${accion.dia}`;
    case "deuda":
      return `deuda «${accion.nombre}» de ${soles(accion.saldo)}, pago de ${soles(accion.pagoMensual)} al mes el día ${accion.dia}`;
  }
}

/** Cómo cambia el punto más bajo, en una frase. */
function cambioDelMinimo(antes: { saldoMasBajo: Centimos; enRojoDesde: FechaISO | null; faltante: Centimos }, despues: typeof antes, dia: FechaISO): string {
  if (antes.saldoMasBajo === despues.saldoMasBajo && antes.enRojoDesde === despues.enRojoDesde) {
    return "El punto más bajo de los próximos 30 días no cambia.";
  }
  if (antes.enRojoDesde && !despues.enRojoDesde) {
    return `Con esto ya no quedas en rojo: tu punto más bajo pasa de ${soles(antes.saldoMasBajo)} a ${soles(despues.saldoMasBajo)}.`;
  }
  if (!antes.enRojoDesde && despues.enRojoDesde) {
    return `Ojo: con esto quedarías en rojo desde el ${formatoLargo(despues.enRojoDesde)}; te faltarían ${soles(despues.faltante)}.`;
  }
  if (despues.enRojoDesde) {
    return `Todavía te faltarían ${soles(despues.faltante)} (antes ${soles(antes.faltante)}); quedas en rojo desde el ${formatoLargo(despues.enRojoDesde)}.`;
  }
  return `Tu punto más bajo de los próximos 30 días pasa de ${soles(antes.saldoMasBajo)} a ${soles(despues.saldoMasBajo)} (el ${formatoCorto(dia)}).`;
}

/** El monto principal de la acción, siempre en positivo (el de la deuda es su saldo). */
export function montoDe(accion: Accion): Centimos {
  return accion.tipo === "deuda" ? accion.saldo : Math.abs(accion.monto);
}

/**
 * ¿Hay que preguntar antes de guardar? Sí cuando lo dicho cambia mucho los números: un gasto mayor que todo
 * el saldo de hoy, o algo que deja en rojo a quien no lo estaba. Un cero de más (por voz es fácil) no debe
 * quedar guardado sin que la persona lo vea primero. Lo chico («gasté 80 en el mercado») se anota al instante.
 */
export function pideConfirmacion(accion: Accion, { antes, despues }: Efecto): boolean {
  if (!antes.enRojoDesde && despues.enRojoDesde) return true;
  return accion.tipo === "saldo" && accion.monto < 0 && antes.saldoHoy > 0 && -accion.monto > antes.saldoHoy;
}

/** La pregunta, siempre con estas palabras: por ella el código reconoce después el «sí» de la persona. */
export const PREGUNTA_CONFIRMAR = "¿Lo anoto?";

/** Lo que se responde en vez de guardar: el efecto calculado (sin anotar) y la pregunta. */
export function fraseDeConfirmacion(accion: Accion, efecto: Efecto): string {
  return `${frase(accion, efecto, false)} Como cambia mucho tus números, todavía no lo guardé. ${PREGUNTA_CONFIRMAR} Dime «sí» para guardarlo, o el monto correcto si me equivoqué.`;
}

const sinEspacios = (t: string) => t.replace(/\s+/g, "");

/** ¿El asistente ya preguntó por este mismo monto en su último mensaje? Solo así vale un «sí, anótalo». */
export function yaPreguntoPor(accion: Accion, ultimoDelAsistente: string | undefined): boolean {
  if (!ultimoDelAsistente || !ultimoDelAsistente.includes("?")) return false;
  return sinEspacios(ultimoDelAsistente).includes(sinEspacios(soles(montoDe(accion))));
}

/**
 * La respuesta escrita por el código. `anotado` = ya quedó en el panel; si no, es una simulación
 * («si te llegara mañana…»).
 */
export function frase(accion: Accion, efecto: Efecto, anotado: boolean): string {
  const { antes, despues } = efecto;
  const inicio = anotado ? "Anotado" : "Si fuera así";
  switch (accion.tipo) {
    case "saldo":
      return [
        `${inicio}: ${conSigno(accion.monto)} (${accion.descripcion}).`,
        `Tu saldo de hoy pasa de ${soles(antes.saldoHoy)} a ${soles(despues.saldoHoy)}.`,
        cambioDelMinimo(antes, despues, despues.diaMasBajo),
      ].join(" ");
    case "fijo":
    case "deuda":
      return [`${inicio}: ${describir(accion)}.`, cambioDelMinimo(antes, despues, despues.diaMasBajo)].join(" ");
    case "cobro": {
      const partesTexto = [
        anotado
          ? `Anotado como pago por llegar: ${soles(accion.monto)} (${accion.quien}) el ${formatoLargo(accion.fecha)}.`
          : `Si te llegaran ${soles(accion.monto)} el ${formatoLargo(accion.fecha)}:`,
      ];
      if (accion.fecha <= efecto.hoy) {
        if (anotado) partesTexto.push("Como es para hoy, no lo sumo a tu saldo hasta que llegue: cuando te paguen, dime «ya me pagaron» y lo paso a tu cuenta.");
        return partesTexto.join(" ");
      }
      const enRojoBase = antes.enRojoDesde;
      if (enRojoBase && accion.fecha > enRojoBase) {
        partesTexto.push(
          `Llega después del ${formatoLargo(enRojoBase)}, el día en que quedas en rojo, así que ese día no lo salva.`,
        );
      }
      // Si ya le debían otros pagos, el escenario «si te pagan» los incluye: se dice para que la cifra no choque con la del inicio.
      const hayOtros = antes.siTePagan.saldoMasBajo !== antes.saldoMasBajo;
      const inicio = hayOtros ? "Si llega a tiempo, contando también lo que ya te deben, tu punto más bajo" : "Si llega a tiempo, tu punto más bajo";
      partesTexto.push(cambioDelMinimo(antes.siTePagan, despues.siTePagan, despues.diaMasBajo).replace("Tu punto más bajo", inicio));
      if (anotado) partesTexto.push("Por prudencia no lo sumo a tu saldo hasta que llegue: cuando te paguen, dime «ya me pagaron» y lo paso a tu cuenta.");
      return partesTexto.join(" ");
    }
  }
}

// ——— Lector determinista de frases (sirve sin IA y como red de seguridad) ———

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[¿?¡!,;:()"«»]/g, " ").replace(/\s+/g, " ").trim();
}

const DIAS_SEMANA: Record<string, number> = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };
const MESES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, setiembre: 9, septiembre: 9,
  octubre: 10, noviembre: 11, diciembre: 12,
};
const NUMEROS_CORTOS: Record<string, number> = { un: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, diez: 10, quince: 15, veinte: 20, treinta: 30 };

/** «hoy», «mañana», «el viernes», «el 20», «el 20 de diciembre», «a fin de mes», «en 5 días», «la próxima semana». */
export function leerFecha(texto: string, hoy: FechaISO): FechaISO | null {
  const t = ` ${normalizar(texto)} `;
  if (/ pasado manana /.test(t)) return sumarDias(hoy, 2);
  if (/ manana /.test(t) && !/ en la manana /.test(t.replace(/ manana .*$/, " manana "))) return sumarDias(hoy, 1);
  if (/ hoy /.test(t)) return hoy;
  const enDias = / en (\d{1,2}|[a-z]+) dias? /.exec(t);
  if (enDias) {
    const n = /^\d+$/.test(enDias[1]) ? Number(enDias[1]) : NUMEROS_CORTOS[enDias[1]];
    if (n && n > 0 && n <= 60) return sumarDias(hoy, n);
  }
  if (/ (en una semana|la proxima semana|la otra semana|la semana que viene) /.test(t)) return sumarDias(hoy, 7);
  if (/ (en dos semanas|en 2 semanas) /.test(t)) return sumarDias(hoy, 14);
  const { anio, mes, dia } = partes(hoy);
  if (/ (fin de mes|fin del mes|ultimo dia del mes|fines de mes) /.test(t)) return fechaEnMes(anio, mes, 31);
  const conMes = / (\d{1,2}) de ([a-z]+) /.exec(t);
  if (conMes && conMes[2] in MESES) {
    const d = Number(conMes[1]);
    const m = MESES[conMes[2]];
    if (d >= 1 && d <= 31) {
      const esteAnio = fechaEnMes(anio, m, d);
      return esteAnio >= hoy ? esteAnio : fechaEnMes(anio + 1, m, d);
    }
  }
  const delMes = / (?:el|este|para el|hasta el) (?:dia )?(\d{1,2}) /.exec(t);
  if (delMes) {
    const d = Number(delMes[1]);
    if (d >= 1 && d <= 31) return d >= dia ? fechaEnMes(anio, mes, d) : fechaEnMes(mes === 12 ? anio + 1 : anio, mes === 12 ? 1 : mes + 1, d);
  }
  for (const [nombreDia, n] of Object.entries(DIAS_SEMANA)) {
    if (t.includes(` ${nombreDia} `)) {
      const diff = (n - diaSemana(hoy) + 7) % 7 || 7;
      return sumarDias(hoy, diff);
    }
  }
  return null;
}

/** Día del mes de algo que se repite: «el 15», «los 30», «cada 5», «a fin de mes». */
function leerDiaDelMes(t: string): number | null {
  const s = ` ${t} `;
  if (/ (fin de mes|fin del mes|ultimo dia) /.test(s)) return 31;
  const m = / (?:el|los|cada|dia|el dia|todos los) (\d{1,2}) /.exec(s);
  if (m) {
    const d = Number(m[1]);
    if (d >= 1 && d <= 31) return d;
  }
  return null;
}

const PALABRAS_VACIAS = new Set([
  "como", "el", "la", "los", "las", "y", "que", "hoy", "manana", "cada", "al", "este", "esta", "esto", "mi", "me", "mes",
  "dia", "lo", "a", "un", "una", "pero", "si", "cambia", "situacion", "todos", "semana", "proxima", "fin", "en", "de", "por",
  "para", "ya", "mas", "eso", "con", "su", "tu", "le", "se", "es", "son", "va", "van", "voy", "vez", "veces", "cuando",
  ...Object.keys(DIAS_SEMANA), ...Object.keys(MESES),
]);
const VERBOS = /^(pag|d[aio]|deposit|cobr|recib|gan|gast|compr|transfer|yape|cay|lleg|acab|ten|deb|prest|sac|pas)/;

/** El «de qué» de la frase: «por limpiar» → «Limpiar», «de luz» → «Luz», «en el mercado» → «Mercado». */
function detalle(resto: string): string | null {
  const palabras = normalizar(resto).split(" ");
  for (let i = 0; i < palabras.length; i++) {
    if (!["por", "de", "del", "en", "para"].includes(palabras[i])) continue;
    const tomadas: string[] = [];
    for (let j = i + 1; j < palabras.length && tomadas.length < 3; j++) {
      const p = palabras[j];
      if (["el", "la", "los", "las", "mi", "un", "una"].includes(p) && tomadas.length === 0) continue;
      if (PALABRAS_VACIAS.has(p) || /\d/.test(p)) break;
      if (tomadas.length === 0 && VERBOS.test(p) && !["pasaje", "pasajes", "comida", "colegio"].includes(p)) break;
      tomadas.push(p);
    }
    if (tomadas.length > 0) {
      const texto = tomadas.join(" ");
      return texto[0].toUpperCase() + texto.slice(1);
    }
  }
  return null;
}

function categoriaDe(texto: string, sentido: "ingreso" | "gasto"): Categoria {
  if (sentido === "ingreso") return /sueldo|salario|planilla|trabajo/.test(texto) ? "sueldo" : "ingreso_variable";
  const reglas: [RegExp, Categoria][] = [
    [/alquiler|cuarto|departamento|renta|casa/, "alquiler"],
    [/luz|agua|internet|celular|telefono|gas|cable|plan/, "servicios"],
    [/netflix|spotify|disney|youtube|suscripcion|hbo|prime|gimnasio/, "suscripciones"],
    [/colegio|curso|universidad|pension|instituto|academia|matricula/, "educacion"],
    [/mercado|comida|menu|almuerzo|bodega|supermercado/, "comida"],
    [/pasaje|movilidad|gasolina|combustible|taxi|bus|transporte/, "transporte"],
    [/medicina|seguro|salud|doctor|farmacia|clinica/, "salud"],
    [/tarjeta|prestamo|cuota|deuda/, "deuda"],
    [/mama|papa|hijo|hija|familia|abuela|abuelo/, "familia"],
  ];
  return reglas.find(([r]) => r.test(texto))?.[1] ?? "otros";
}

const HIPOTESIS = /(^| )(y si|si gasto|si compro|si pago|me alcanza|alcanzaria|alcanza para|puedo gastar|puedo comprar|podria|que pasa si|que pasaria|deberia|conviene)( |$)/;
const MENSUAL = /(^| )(cada mes|al mes|mensual|mensualmente|todos los meses|cada fin de mes|por mes)( |$)/;
const DEUDA = /(^| )(debo|le debo|les debo|tengo una deuda|me endeude|me prestaron|me preste|me he prestado|me habia prestado|me (dieron|aprobaron|dan|van a dar) un (prestamo|credito)|(saque|pedi|tengo|tome|saco|voy a sacar) (un|otro) (prestamo|credito))( |$)/;
const INGRESO_FUTURO = /(^| )(me van a (pagar|dar|depositar|transferir|yapear|pasar|devolver)|voy a (ganar|cobrar|recibir)|me (pagaran|daran|depositaran|devolveran)|me (debe|deben)|me tienen que pagar|me tiene que pagar)( |$)/;
const GASTO_PASADO = /(^| )(gaste|pague|compre|me cobraron|me acaban de cobrar|me descontaron|se me fue|perdi|preste|tuve que pagar)( |$)/;
const INGRESO_PASADO = /(^| )(me pagaron|me dieron|me depositaron|me yapearon|me transfirieron|me devolvieron|cobre|recibi|me cayo|me cayeron|me llego|me llegaron|me acaban de (pagar|dar|depositar|yapear|transferir)|gane|ya me pagaron)( |$)/;
/** Plata que cayó de sorpresa y ya está en la mano: un ingreso de una sola vez, sin juicios. */
const HALLAZGO = /(^| )(me encontre|encontre|halle|me halle|me tope con)( |$)/;
const REGALO = /(^| )(me regalaron|me regalo|me obsequiaron|me obsequio)( |$)/;
/** Pensar en endeudarse (o en que le presten) es plata que se debe, no plata que llega: nunca se anota como ingreso. */
const ENDEUDARSE = /(^| )(endeudar(me|nos|se|te)?|me van a prestar|me prestaran|prestarme|pedir prestado|pedire prestado)( |$)/;
const INGRESO_GENERAL = /(^| )(gano|me pagan|cobro|recibo|sueldo|salario|ingreso)( |$)/;

/** Con qué empieza una pregunta: «cuánto gasté…», «qué pasa…», «por qué…». Va sobre el texto ya normalizado. */
const INTERROGATIVA = /^(cuanto|cuanta|cuantos|cuantas|cuando|que|como|donde|adonde|cual|cuales|quien|quienes|por que|para que|a cuanto|de cuanto|en que)( |$)/;
const NOMBRES_DE_MES = Object.keys(MESES).join("|");

/**
 * Lo que la persona AFIRMA: el mensaje sin sus preguntas. Una pregunta nunca anota nada, aunque traiga un verbo
 * como «gasté» o «ganar» y un número: «¿cuánto gasté el 3 de marzo de 2021?» no es un gasto de 2021 soles.
 * «Me van a dar 100 por limpiar ¿cómo cambia mi situación?» conserva la primera parte, que sí es para anotar.
 */
export function soloAfirmaciones(texto: string): string {
  return texto
    .split(/(?<=[.!?])\s+|(?=¿)/)
    .filter(oracion => !oracion.trimStart().startsWith("¿") && !INTERROGATIVA.test(normalizar(oracion)))
    // «¿Voy a ganar la hackathon? para… endeudarme con 1000»: una pregunta sin cifra (aunque falte el «¿») no presta
    // su verbo a la cifra de otra frase. Con cifra se queda: «gasté 80 en el mercado, cómo voy?» sí se anota.
    .filter(oracion => !(oracion.trimEnd().endsWith("?") && !buscarMonto(sinFechasNiPorcentajes(oracion))))
    .join(" ")
    .trim();
}

/**
 * Quita lo que parece un monto y no lo es, antes de buscar la cifra: el año de una fecha («3 de marzo de 2021»,
 * «en 2021») y los porcentajes («5 %», «diez por ciento»; «ciento» solo se leería como cien soles).
 */
export function sinFechasNiPorcentajes(texto: string): string {
  return texto
    .replace(new RegExp(`\\b(${NOMBRES_DE_MES})(\\s+del?)?\\s+(19|20)\\d{2}\\b`, "gi"), "$1")
    .replace(/\b(en|del|el|a[nñ]o)\s+(19|20)\d{2}\b(?!\s*(soles|sol|lucas|mangos)\b)/gi, "$1")
    .replace(/\d+(?:[.,]\d+)?\s*%/g, " ")
    // «un diez por ciento»: se van también las dos palabras de antes, que son el número del porcentaje.
    .replace(/(?:\S+\s+){0,2}por\s+ciento\b/gi, " ");
}

export type Lectura =
  | { tipo: "accion"; accion: Accion }
  /** Falta la fecha de un pago por llegar: `vistaPrevia` supone que llega mañana, solo para mostrar el efecto. */
  | { tipo: "falta_fecha"; vistaPrevia: Accion & { tipo: "cobro" }; pregunta: string }
  | { tipo: "falta_dia"; pregunta: string }
  | { tipo: "guia"; texto: string };

/**
 * Lee una frase y decide qué anotar. Devuelve null si no es algo para anotar (una pregunta, un «¿y si…?»).
 * `previa` es el mensaje anterior de la persona: «el viernes» completa «me van a dar 100».
 */
export function interpretarRegistro(texto: string, hoy: FechaISO, previa?: string): Lectura | null {
  // Solo se lee lo que la persona afirma; sus preguntas se dejan para quien responde (la IA o el motor).
  const dicho = soloAfirmaciones(texto);
  const t = normalizar(dicho);
  if (!t) return null;
  if (HIPOTESIS.test(t)) return null;
  const hallado = buscarMonto(sinFechasNiPorcentajes(dicho));
  if (!hallado) {
    // «el viernes», «el 20»: completa el mensaje anterior si a ese le faltaba la fecha o el día.
    if (previa && (leerFecha(dicho, hoy) || leerDiaDelMes(t))) {
      const antes = interpretarRegistro(previa, hoy);
      if (antes && (antes.tipo === "falta_fecha" || antes.tipo === "falta_dia")) return interpretarRegistro(`${soloAfirmaciones(previa)} ${dicho}`, hoy);
    }
    return null;
  }
  const { monto, resto } = hallado;
  const de = detalle(resto);

  // Primero la deuda: «saqué un préstamo de dos mil, pago doscientos al mes» NO es un gasto fijo de dos mil.
  // Una deuda tiene varios montos (saldo, cuota) y el lector rápido no los separa: la anota la IA con
  // anotar_deuda o, sin IA, se piden los datos en el formulario.
  if (DEUDA.test(t)) {
    return {
      tipo: "guia",
      texto: `Para anotar una deuda de ${soles(monto)} necesito saber con quién es, cuánto pagas al mes y qué día. Con el asistente activado basta con decírmelo; si no, agrégala en Deudas.`,
    };
  }

  // Un plan de endeudarse no se anota: lo responde quien explica (la IA, con el costo que calcula el motor).
  if (ENDEUDARSE.test(t)) return null;

  if (MENSUAL.test(t)) {
    const sentido = INGRESO_GENERAL.test(t) || INGRESO_FUTURO.test(t) ? "ingreso" : "gasto";
    const dia = leerDiaDelMes(t);
    if (dia === null) {
      return { tipo: "falta_dia", pregunta: `¿Qué día del mes ${sentido === "ingreso" ? "te pagan" : "lo pagas"} esos ${soles(monto)}?` };
    }
    return {
      tipo: "accion",
      accion: {
        tipo: "fijo", sentido, monto, dia, categoria: categoriaDe(t, sentido),
        descripcion: de ?? (sentido === "ingreso" ? "Ingreso mensual" : "Gasto mensual"),
      },
    };
  }
  if (INGRESO_FUTURO.test(t)) {
    const fecha = leerFecha(dicho, hoy);
    const quien = de ?? "Ingreso por llegar";
    if (!fecha) {
      return {
        tipo: "falta_fecha",
        vistaPrevia: { tipo: "cobro", quien, monto, fecha: sumarDias(hoy, 1) },
        pregunta: `¿Qué día te pagan esos ${soles(monto)}? Dímelo («el viernes», «el 20») y lo anoto.`,
      };
    }
    return { tipo: "accion", accion: { tipo: "cobro", quien, monto, fecha } };
  }
  if (GASTO_PASADO.test(t)) {
    return { tipo: "accion", accion: { tipo: "saldo", monto: -monto, descripcion: de ? `Gasto: ${de}` : "Gasto" } };
  }
  if (HALLAZGO.test(t)) return { tipo: "accion", accion: { tipo: "saldo", monto, descripcion: "Dinero encontrado" } };
  if (REGALO.test(t)) return { tipo: "accion", accion: { tipo: "saldo", monto, descripcion: "Regalo" } };
  if (INGRESO_PASADO.test(t)) {
    return { tipo: "accion", accion: { tipo: "saldo", monto, descripcion: de ? `Ingreso: ${de}` : "Ingreso extra" } };
  }
  return null;
}

const AFIRMA = /^(si+|sip|claro|dale|ok|okay|okey|ya|listo|correcto|confirmo|confirmado|exacto|asi es|de acuerdo|hazlo|anotalo|guardalo|esta bien)( |$)/;
const NIEGA = /^(no+|nop|nel|mejor no|cancela|cancelalo|olvidalo|dejalo|no lo anotes|no lo guardes)( |$)/;

/** «sí», «dale, anótalo», «no, mejor no»: respuesta corta y sin cifras a la pregunta de confirmación. */
function respuestaCorta(texto: string): "si" | "no" | null {
  const t = normalizar(texto).replace(/[.]/g, " ").trim();
  if (!t || t.split(" ").length > 6 || buscarMonto(sinFechasNiPorcentajes(texto))) return null;
  if (NIEGA.test(t)) return "no";
  return AFIRMA.test(t) ? "si" : null;
}

export interface MensajeSimple {
  rol: "usuario" | "asistente";
  texto: string;
}

/**
 * Respuesta sin IA a algo para anotar. Devuelve el texto (escrito por el código) y, si corresponde,
 * la acción para guardar. null si el mensaje no es para anotar.
 */
export function responderRegistro(
  mensajes: readonly MensajeSimple[],
  situacion: Situacion,
): { texto: string; accion?: Accion; /** Solo orienta (faltan datos que el código no sabe pedir): con IA, mejor que responda ella. */ guia?: true } | null {
  const deUsuario = mensajes.filter(m => m.rol === "usuario" && m.texto.trim());
  const ultimo = deUsuario.at(-1);
  if (!ultimo || mensajes.at(-1)?.rol !== "usuario") return null;
  const hoy = situacion.perfil.hoy;
  const anterior = mensajes.at(-2);
  const dichoPorAsistente = anterior?.rol === "asistente" ? anterior.texto : undefined;
  // ¿Responde a «¿Lo anoto?»? Solo cuenta si esa pregunta la hizo el código justo antes, por lo que ella misma dijo.
  if (dichoPorAsistente?.includes(PREGUNTA_CONFIRMAR)) {
    const corta = respuestaCorta(ultimo.texto);
    const previo = deUsuario.at(-2);
    const pendiente = corta && previo ? interpretarRegistro(previo.texto, hoy, deUsuario.at(-3)?.texto) : null;
    if (pendiente?.tipo === "accion" && yaPreguntoPor(pendiente.accion, dichoPorAsistente)) {
      if (corta === "no") return { texto: "Listo, no anoté nada. Si el monto era otro, dímelo y lo vemos." };
      return { texto: frase(pendiente.accion, efectoDe(pendiente.accion, situacion), true), accion: pendiente.accion };
    }
  }
  const lectura = interpretarRegistro(ultimo.texto, hoy, deUsuario.at(-2)?.texto);
  if (!lectura) return null;
  switch (lectura.tipo) {
    case "guia":
      return { texto: lectura.texto, guia: true };
    case "falta_dia":
      return { texto: lectura.pregunta };
    case "falta_fecha": {
      const vista = frase(lectura.vistaPrevia, efectoDe(lectura.vistaPrevia, situacion), false);
      return { texto: `${vista} ${lectura.pregunta}` };
    }
    case "accion": {
      const efecto = efectoDe(lectura.accion, situacion);
      // Si cambia mucho sus números, primero se muestra y se pregunta; se guarda cuando lo repite o dice que sí.
      const yaPreguntado = dichoPorAsistente?.includes(PREGUNTA_CONFIRMAR) && yaPreguntoPor(lectura.accion, dichoPorAsistente);
      if (pideConfirmacion(lectura.accion, efecto) && !yaPreguntado) {
        return { texto: fraseDeConfirmacion(lectura.accion, efecto) };
      }
      return { texto: frase(lectura.accion, efecto, true), accion: lectura.accion };
    }
  }
}
