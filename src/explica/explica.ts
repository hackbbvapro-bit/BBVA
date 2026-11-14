/**
 * Convierte los cálculos del motor en frases. Aquí no se calcula dinero: solo se
 * eligen y se redactan cifras que ya vienen calculadas (y probadas) en `Analisis`.
 * Lo usan la pantalla, las notificaciones, la voz y el respaldo cuando no hay IA.
 */
import {
  aCentimos, formatoLargo, formatoSoles, formatoTasa, simularGasto, sumarDias,
} from "../motor";
import type { Analisis, EventoProyectado, FechaISO, Jugada, Perfil } from "../motor";

export type NivelAviso = "urgente" | "atencion" | "bien";

export interface Aviso {
  id: string;
  nivel: NivelAviso;
  titulo: string;
  cuerpo: string;
  /** Día al que se refiere el aviso, si aplica. */
  fecha?: FechaISO;
}

/** "a", "a y b", "a, b y c" */
export function enLista(elementos: readonly string[]): string {
  const unicos = [...new Set(elementos)];
  if (unicos.length <= 1) return unicos[0] ?? "";
  return `${unicos.slice(0, -1).join(", ")} y ${unicos[unicos.length - 1]}`;
}

function enDias(dias: number): string {
  if (dias <= 0) return "Hoy";
  return dias === 1 ? "Mañana" : `En ${dias} días`;
}

function minusculaInicial(texto: string): string {
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

/** Salidas fijas (alquiler, servicios, pagos de deuda) de los próximos `dias` días, por fecha. */
export function proximosPagos(analisis: Analisis, dias = 7): EventoProyectado[] {
  const limite = sumarDias(analisis.hoy, dias);
  return analisis.proyeccion.dias
    .filter(d => d.fecha <= limite)
    .flatMap(d => d.eventos.filter(e => e.origen === "recurrente" && e.monto < 0));
}

/** La jugada que resuelve sola el déficit con menor costo (el motor ya las entrega ordenadas). */
export function mejorJugada(analisis: Analisis): Jugada | undefined {
  return analisis.jugadas.find(j => j.resuelve);
}

function avisoDeficit(analisis: Analisis): Aviso | undefined {
  const deficit = analisis.proyeccion.deficit;
  if (!deficit) return undefined;
  const causas = enLista(deficit.causas.map(c => c.descripcion));
  const verbo = deficit.causas.length > 1 ? "se juntan" : "sale";
  const jugada = mejorJugada(analisis);
  const salida = jugada
    ? ` La salida más barata: ${minusculaInicial(jugada.titulo)}; ${jugada.costo > 0 ? `cuesta ${formatoSoles(jugada.costo)}` : "no cuesta dinero"}.`
    : analisis.jugadas.length > 0 ? " Ninguna jugada alcanza sola: hay que combinar dos." : "";
  return {
    id: "deficit", nivel: "urgente", fecha: deficit.fecha,
    titulo: `${enDias(deficit.diasRestantes)} te faltarán ${formatoSoles(deficit.faltante)}`,
    cuerpo: `El ${formatoLargo(deficit.fecha)} ${verbo} ${causas} y la cuenta queda en rojo.${salida}`,
  };
}

function avisoHolgura(analisis: Analisis): Aviso {
  const { saldoMinimo, fechaSaldoMinimo } = analisis.proyeccion;
  return {
    id: "holgura", nivel: "bien", fecha: fechaSaldoMinimo,
    titulo: "Llegas bien a los próximos 30 días",
    cuerpo: `Tu día más ajustado será el ${formatoLargo(fechaSaldoMinimo)}: te quedarán ${formatoSoles(saldoMinimo)} en la cuenta.`,
  };
}

function avisoPago(analisis: Analisis): Aviso | undefined {
  const deficit = analisis.proyeccion.deficit;
  const pago = proximosPagos(analisis, 7).find(p => !deficit || p.fecha < deficit.fecha);
  if (!pago) return undefined;
  return {
    id: "pago", nivel: "atencion", fecha: pago.fecha,
    titulo: `Se viene ${pago.descripcion}: ${formatoSoles(-pago.monto)}`,
    cuerpo: `Sale el ${formatoLargo(pago.fecha)}. Ya está contado en tu proyección.`,
  };
}

function avisoDeuda(perfil: Perfil, analisis: Analisis): Aviso | undefined {
  const deudas = analisis.deudas;
  if (!deudas?.primera) return undefined;
  const { primera, avalancha, minimos, ahorroVsMinimos } = deudas;
  const tasa = `${formatoTasa(primera.tceaBp)} al año (TCEA)`;
  const plan = avalancha.noTermina
    ? "Con lo que pagas hoy esa deuda no baja: hay que subir el pago mensual."
    : minimos.noTermina
      ? `Pagando solo el mínimo nunca baja. Con lo que ya pagas cada mes terminas en ${avalancha.meses} meses.`
      : `Con lo que ya pagas cada mes terminas en ${avalancha.meses} meses y te ahorras ${formatoSoles(ahorroVsMinimos)} en intereses frente a pagar solo el mínimo (${minimos.meses} meses).`;
  const varias = perfil.deudas.length > 1;
  return {
    id: "deuda", nivel: "atencion",
    titulo: varias ? `Paga primero ${primera.nombre}` : `No te quedes en el mínimo de ${primera.nombre}`,
    cuerpo: `${varias ? "Es tu deuda más cara" : "Te cuesta"}: ${tasa}. ${plan}`,
  };
}

/** Avisos del perfil, del más urgente al menos. Siempre devuelve al menos uno. */
export function avisos(perfil: Perfil, analisis: Analisis): Aviso[] {
  return [avisoDeficit(analisis) ?? avisoHolgura(analisis), avisoPago(analisis), avisoDeuda(perfil, analisis)]
    .filter((a): a is Aviso => a !== undefined);
}

/** Resumen corto pensado para escucharse. */
export function resumenHablado(perfil: Perfil, analisis: Analisis): string {
  const [principal, ...resto] = avisos(perfil, analisis);
  const deuda = resto.find(a => a.id === "deuda");
  return [
    `${perfil.nombre}, hoy tienes ${formatoSoles(perfil.saldoActual)} en tu cuenta.`,
    `${principal.titulo}. ${principal.cuerpo}`,
    deuda ? `Sobre tus deudas: ${minusculaInicial(deuda.titulo)}.` : "",
  ].filter(Boolean).join(" ");
}

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function explicarJugada(jugada: Jugada): string {
  const efecto = jugada.resuelve ? "Con eso ya no quedas en rojo." : "Sola no alcanza para salir del rojo.";
  return `${jugada.detalle} Costo: ${jugada.costoDetalle}. ${efecto}`;
}

function responderGasto(texto: string, perfil: Perfil, analisis: Analisis): string | undefined {
  if (!/alcanza|comprar|gastar|puedo/.test(texto)) return undefined;
  const cifra = /(\d{1,6}(?:\.\d{1,2})?)/.exec(texto.replace(/,/g, ""));
  if (!cifra) return undefined;
  const monto = aCentimos(cifra[1]);
  if (monto <= 0) return undefined;
  const r = simularGasto(analisis.proyeccion, sumarDias(perfil.hoy, 1), monto);
  if (r.alcanza) {
    return `Sí te alcanza. Si gastas ${formatoSoles(monto)} mañana, tu día más ajustado sería el ${formatoLargo(r.fechaSaldoMinimoDespues)}, con ${formatoSoles(r.saldoMinimoDespues)} en la cuenta.`;
  }
  if (r.yaHabiaDeficit) {
    return `Ahora no te conviene: aun sin ese gasto te faltaría plata el ${formatoLargo(analisis.proyeccion.deficit?.fecha ?? r.fechaSaldoMinimoDespues)}. Primero resuelve eso.`;
  }
  return `No sin apretarte: con ${formatoSoles(monto)} quedarías en rojo el ${formatoLargo(r.primerDiaBajoCero ?? r.fechaSaldoMinimoDespues)}. Lo máximo que puedes gastar mañana sin quedar en rojo es ${formatoSoles(r.maximoSinDeficit)}.`;
}

function responderJugada(texto: string, analisis: Analisis): string | undefined {
  const reglas: [RegExp, Jugada["tipo"]][] = [
    [/minimo/, "pagar_minimo"], [/mover|fecha|atras|aplaz/, "mover_pago"], [/recort|gast|ahorr/, "recortar_gasto"],
  ];
  const tipo = reglas.find(([patron]) => patron.test(texto))?.[1];
  if (!tipo) return undefined;
  const jugada = analisis.jugadas.find(j => j.tipo === tipo);
  if (jugada) return explicarJugada(jugada);
  if (tipo !== "recortar_gasto") return undefined;
  const mayor = analisis.gastoVariable.porCategoria[0];
  return mayor ? `Tu mayor gasto del día a día es ${mayor.categoria}: ${formatoSoles(mayor.mensual)} al mes.` : undefined;
}

/** Respuesta armada solo con cálculos del motor, para cuando la IA no está disponible. */
export function responderSinIA(pregunta: string, perfil: Perfil, analisis: Analisis): string {
  const texto = normalizar(pregunta);
  const gasto = responderGasto(texto, perfil, analisis);
  if (gasto) return gasto;
  const jugada = responderJugada(texto, analisis);
  if (jugada) return jugada;
  if (/deuda|tarjeta|primero|tcea|interes|prestamo/.test(texto)) {
    const deuda = avisos(perfil, analisis).find(a => a.id === "deuda");
    return deuda ? `${deuda.titulo}. ${deuda.cuerpo}` : "No tienes deudas registradas.";
  }
  return resumenHablado(perfil, analisis);
}

function solesHablados(_: string, signo: string | undefined, enteros: string, centimos: string | undefined): string {
  const numero = enteros.replace(/,/g, "");
  const unidad = numero === "1" ? "sol" : "soles";
  const resto = centimos && centimos !== "00" ? ` con ${Number(centimos)} céntimos` : "";
  return `${signo ? "menos " : ""}${numero} ${unidad}${resto}`;
}

/** Prepara un texto para leerse en voz alta: montos, porcentajes y siglas dichos como se hablan. */
export function paraVoz(texto: string): string {
  return texto
    .replace(/(-)?S\/\s?(\d[\d,]*)(?:\.(\d{2}))?/g, solesHablados)
    .replace(/(\d+)\.(\d+)\s?%/g, (_, ent: string, dec: string) =>
      Number(dec) === 0 ? `${ent} por ciento` : `${ent} coma ${dec} por ciento`)
    .replace(/(\d+)\s?%/g, "$1 por ciento")
    .replace(/\s*\(TCEA\)/g, "")
    .replace(/\bTCEA\b/g, "tasa de costo anual")
    .replace(/[*#_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
