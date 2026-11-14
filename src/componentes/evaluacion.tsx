"use client";
import { formatoSoles } from "@/motor";
import { Encabezado, tarjeta, unido } from "@/componentes/ui";
// Los dos archivos los escribe `npm run evaluar`: aquí no se teclea ninguna cifra, solo se leen y se pintan.
import resultados from "../../docs/evaluacion/resultados.json";
import asistente from "../../docs/evaluacion/agente.json";

type Metodo = keyof typeof resultados.pronostico.global.metodos;
type Horizonte = "d7" | "d14" | "d30";

/** El copiloto primero; después las alternativas simples contra las que se compara. */
const METODOS: [Metodo, string, string][] = [
  ["motor", "Copiloto", "Detecta los pagos fijos, los pone en su fecha y suma un estimado prudente del día a día"],
  ["repetir_30", "Repetir el último mes", "Supone que los próximos 30 días serán iguales a los últimos 30"],
  ["promedio_90", "Promedio de 90 días", "Reparte por igual, día a día, lo que entró y salió en 90 días"],
  ["saldo_plano", "Saldo sin cambios", "Supone que el saldo se queda como está"],
];
const HORIZONTES: [Horizonte, string][] = [["d7", "A 7 días"], ["d14", "A 14 días"], ["d30", "A 30 días"]];
const TRAMPAS: Record<string, string> = {
  rentabilidad: "Pedirle una rentabilidad",
  inyeccion: "Ordenarle que cambie el saldo",
  aprobacion: "Pedirle un banco que apruebe seguro",
  "dato-que-no-hay": "Pedirle un dato que no tiene",
  "fuera-de-tema": "Preguntarle otra cosa",
  "datos-personales": "Ofrecerle una clave",
};

const pct = (valor: number | null) => (valor === null ? "No avisa nunca" : `${(valor * 100).toFixed(1)} %`);
const miles = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const celda = "border-t border-linea px-3 py-2.5";
const titulo = "text-lg font-semibold text-noche";
const nota = "mt-1 text-sm leading-relaxed text-gris";

/** Puesto del copiloto entre los cuatro métodos en un horizonte (1 = menor error). */
function puesto(h: Horizonte): number {
  const { metodos } = resultados.pronostico.global;
  const errores = METODOS.map(([m]) => metodos[m].error[h].mae).sort((a, b) => a - b);
  return errores.indexOf(metodos.motor.error[h].mae) + 1;
}
function lecturaDelPuesto(h: Horizonte, etiqueta: string): string {
  const p = puesto(h);
  const cual = p === 1 ? "el menor error de los cuatro" : p === METODOS.length ? "el mayor error de los cuatro" : `el puesto ${p} de ${METODOS.length}`;
  return `${etiqueta} tiene ${cual}`;
}

function Cifra({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-linea bg-white p-4">
      <p className="text-[1.375rem] font-semibold leading-tight tabular-nums text-noche">{unido(valor)}</p>
      <p className="mt-1 text-[13px] leading-snug text-gris">{etiqueta}</p>
    </div>
  );
}

/**
 * «Evaluación»: qué tan bien funciona el copiloto, medido con clientes sintéticos y comparado con
 * alternativas simples. Muestra también lo que sale mal. Todas las cifras vienen de los archivos de resultados.
 */
export function Evaluacion() {
  const { poblacion, pronostico, decision, configuracion } = resultados;
  const { metodos } = pronostico.global;
  const motor = metodos.motor.aviso;
  const mejorAlternativa = METODOS.slice(1)
    .map(([m, nombre]) => ({ nombre, recall: metodos[m].aviso.recall }))
    .sort((a, b) => b.recall - a.recall)[0];
  const { primeraJugada, todasLasJugadas } = decision.avisosAcertados;
  const falsas = decision.falsasAlarmas;
  const r = asistente.resumen;
  const trampas = Object.keys(TRAMPAS).flatMap(id => asistente.respuestas.filter(f => f.pregunta_id === id).slice(0, 1));
  const adversas = asistente.respuestas.filter(f => f.clase === "adversa");
  const sinIA = asistente.respuestas.filter(f => f.origen !== "ia");

  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Evaluación"
        bajada={`Probamos el copiloto con ${miles(poblacion.clientes)} clientes inventados. A cada uno le mostramos ${configuracion.diasDeHistoria} días de movimientos, le pedimos proyectar los ${configuracion.diasEvaluados} siguientes y comparamos con lo que de verdad pasó. Aquí está también lo que sale mal.`}
      />

      <section aria-label="La prueba en cifras" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra valor={miles(poblacion.clientes)} etiqueta="clientes sintéticos, generados con semilla fija" />
        <Cifra valor={miles(poblacion.movimientos.total)} etiqueta="movimientos en total" />
        <Cifra valor={pct(poblacion.deficitReal)} etiqueta="cayó en déficit en los 30 días siguientes" />
        <Cifra valor={String(METODOS.length - 1)} etiqueta="alternativas simples con las que se compara" />
      </section>

      <section className={tarjeta} aria-labelledby="eval-aviso">
        <h2 id="eval-aviso" className={titulo}>
          ¿Avisa cuando viene un déficit?
        </h2>
        <p className={nota}>
          El copiloto detecta el {pct(motor.recall)} de los déficits reales ({motor.vp} de {motor.vp + motor.fn}). La mejor alternativa simple,
          «{mejorAlternativa.nombre}», detecta el {pct(mejorAlternativa.recall)}. El precio: de cada 100 avisos se cumplen {Math.round((motor.precision ?? 0) * 100)}.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gris">
                <th className="px-3 py-2 font-medium">Método</th>
                <th className="px-3 py-2 text-right font-medium">Déficits que detecta</th>
                <th className="px-3 py-2 text-right font-medium">Avisos que se cumplen</th>
                <th className="px-3 py-2 text-right font-medium">Falsas alarmas</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {METODOS.map(([m, nombre, que]) => {
                const a = metodos[m].aviso;
                return (
                  <tr key={m} className={m === "motor" ? "bg-agua-suave/50 font-semibold text-noche" : "text-tinta"}>
                    <td className={celda}>
                      {nombre}
                      <span className="block text-xs font-normal text-gris">{que}</span>
                    </td>
                    <td className={`${celda} text-right`}>{pct(a.recall)}</td>
                    <td className={`${celda} text-right`}>{pct(a.precision)}</td>
                    <td className={`${celda} text-right`}>{pct(a.falsosPositivos)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className={nota}>Falsa alarma: avisar a alguien que al final no tuvo déficit.</p>
      </section>

      <section className={tarjeta} aria-labelledby="eval-saldo">
        <h2 id="eval-saldo" className={titulo}>
          ¿Acierta el saldo?
        </h2>
        <p className={nota}>
          Error medio del saldo previsto, en soles (menos es mejor). El copiloto {HORIZONTES.map(([h, etiqueta]) => lecturaDelPuesto(h, etiqueta.toLowerCase())).join("; ")}.
          Se equivoca hacia el lado prudente: a 30 días prevé de media {unido(formatoSoles(Math.abs(metodos.motor.error.d30.sesgo)))}{" "}
          {metodos.motor.error.d30.sesgo < 0 ? "menos" : "más"} de lo que hubo. Sirve como alerta, no como pronóstico exacto del saldo.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[30rem] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gris">
                <th className="px-3 py-2 font-medium">Método</th>
                {HORIZONTES.map(([h, etiqueta]) => (
                  <th key={h} className="px-3 py-2 text-right font-medium">
                    {etiqueta}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {METODOS.map(([m, nombre]) => (
                <tr key={m} className={m === "motor" ? "bg-agua-suave/50 font-semibold text-noche" : "text-tinta"}>
                  <td className={celda}>{nombre}</td>
                  {HORIZONTES.map(([h]) => (
                    <td key={h} className={`${celda} text-right`}>
                      {unido(formatoSoles(metodos[m].error[h].mae))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={tarjeta} aria-labelledby="eval-jugada">
          <h2 id="eval-jugada" className={titulo}>
            ¿La jugada ayuda?
          </h2>
          <p className={nota}>
            En los {primeraJugada.n} avisos acertados, aplicamos la jugada sobre lo que de verdad pasó. Supone que la persona hace exactamente lo que se le propone.
          </p>
          <dl className="mt-3 text-[15px]">
            {(
              [
                ["Déficit evitado con la primera jugada", pct(primeraJugada.evitados)],
                ["Déficit evitado con todas las jugadas", pct(todasLasJugadas.evitados)],
                ["Faltante medio sin hacer nada", formatoSoles(primeraJugada.faltanteMedioAntes)],
                ["Faltante medio con la primera jugada", formatoSoles(primeraJugada.faltanteMedioDespues)],
                ["Faltante medio con todas", formatoSoles(todasLasJugadas.faltanteMedioDespues)],
              ] as const
            ).map(([etiqueta, valor]) => (
              <div key={etiqueta} className="flex flex-wrap items-baseline gap-x-4 border-t border-linea py-2">
                <dt className="text-gris">{etiqueta}</dt>
                <dd className="ml-auto font-medium tabular-nums text-noche">{unido(valor)}</dd>
              </div>
            ))}
          </dl>
          <p className={nota}>Ayuda, pero no resuelve: en la mayoría de los casos el hueco se achica y no desaparece.</p>
        </section>

        <section className={tarjeta} aria-labelledby="eval-dano">
          <h2 id="eval-dano" className={titulo}>
            ¿Hace daño cuando se equivoca?
          </h2>
          <p className={nota}>Qué le pasó a quien recibió un aviso que no se cumplió y aun así siguió la jugada.</p>
          <dl className="mt-3 text-[15px]">
            {(
              [
                ["Falsas alarmas revisadas", String(falsas.n)],
                ["Déficits que la jugada provocó", String(falsas.deficitCreado)],
                ["Casos en que seguirla costó algo", pct(falsas.conCosto)],
                ["Costo medio de seguirla", formatoSoles(falsas.costoMedio)],
              ] as const
            ).map(([etiqueta, valor]) => (
              <div key={etiqueta} className="flex flex-wrap items-baseline gap-x-4 border-t border-linea py-2">
                <dt className="text-gris">{etiqueta}</dt>
                <dd className="ml-auto font-medium tabular-nums text-noche">{unido(valor)}</dd>
              </div>
            ))}
          </dl>
          <p className={nota}>Por eso el copiloto prefiere avisar de más: el costo medido de una falsa alarma es la molestia, no el dinero.</p>
        </section>
      </div>

      <section className={tarjeta} aria-labelledby="eval-asistente">
        <h2 id="eval-asistente" className={titulo}>
          ¿El asistente con IA cambia los números?
        </h2>
        <p className={nota}>
          {r.preguntas} preguntas con IA real a los {r.casos.length} clientes de «Datos de prueba», {adversas.length} de ellas tramposas. De cada respuesta se
          sacan montos, porcentajes, fechas y plazos, y se busca cada uno en lo que el motor calculó.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Cifra valor={`${r.respondidas_con_ia} de ${r.preguntas}`} etiqueta="respondidas por la IA" />
          <Cifra valor={`${r.respuestas_con_alguna_cifra_sin_verificar} de ${r.respondidas_con_ia}`} etiqueta="respuestas de la IA con una cifra que el motor no dio" />
          <Cifra valor={`${(r.latencia_ms.mediana / 1000).toFixed(1)} s`} etiqueta="tiempo de respuesta, mediana" />
          <Cifra valor={`${r.palabras_mediana}`} etiqueta="palabras por respuesta, mediana" />
        </div>
        {sinIA.length > 0 && (
          <p role="note" className="mt-4 rounded-xl bg-ambar-suave px-4 py-3 text-sm leading-relaxed text-ambar-fuerte">
            {sinIA.length} de las {r.preguntas} preguntas no llegaron a la IA: las contestó una regla del motor que intenta anotar ingresos y gastos
            {sinIA.some(f => f.clase === "adversa") ? ", y en preguntas tramposas entendió mal lo que se le pedía. Están abajo, tal como salieron." : "."}
          </p>
        )}
        <h3 className="mt-5 text-sm font-semibold text-noche">Las preguntas tramposas y lo que contestó</h3>
        <div className="mt-1">
          {trampas.map(f => (
            <details key={f.pregunta_id} className="border-t border-linea py-3">
              <summary className="cursor-pointer text-[15px] font-medium text-noche">
                {TRAMPAS[f.pregunta_id]}: <span className="font-normal text-gris">«{f.pregunta}»</span>
                {f.origen !== "ia" && <span className="ml-2 rounded-full bg-ambar-suave px-2 py-0.5 text-xs font-medium text-ambar-fuerte">sin IA</span>}
              </summary>
              <p className="mt-2 rounded-xl bg-niebla p-3 text-sm leading-relaxed text-tinta">{unido(f.respuesta)}</p>
            </details>
          ))}
        </div>
        <p className={nota}>Son {r.preguntas} respuestas de una corrida ({r.fecha}): no garantiza que nunca cambie un número. Si la IA falla, responde el motor.</p>
      </section>

      <section className={`${tarjeta} bg-niebla`} aria-labelledby="eval-limites">
        <h2 id="eval-limites" className={titulo}>
          Lo que esta evaluación no demuestra
        </h2>
        <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-tinta">
          <li>Que acierte con personas reales: los datos son inventados, y el generador y el copiloto los hizo el mismo equipo.</li>
          <li>Las proporciones de los datos (cuántos independientes, cuánto se gasta) son supuestos de diseño, no estadísticas del mercado.</li>
          <li>Cuánta gente seguiría de verdad una jugada.</li>
        </ul>
        <p className={nota}>
          Se repite con <code className="rounded bg-white px-1.5 py-0.5 text-[13px]">npm run evaluar</code>: mismas semillas ({configuracion.semillaAjuste} y{" "}
          {configuracion.semillaEvaluacion}), mismo resultado. El detalle está en docs/EVALUACION.md y docs/DATOS.md del repositorio.
        </p>
      </section>
    </div>
  );
}
