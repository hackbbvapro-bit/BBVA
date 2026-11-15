import { Portada, tarjeta } from "@/componentes/ui";

const PASOS: readonly (readonly [string, string])[] = [
  ["Tú traes el dato", "Cargas el reporte de ejemplo (inventado), escribes las cifras del caso a mano o se las cuentas al copiloto."],
  ["El reporte ya viene leído", "En este prototipo la lectura del reporte de ejemplo está precargada: no es una IA leyendo en vivo. En este paso nada se calcula ni se decide."],
  ["Tú confirmas", "Ves cada registro en una tarjeta, lo corriges si hace falta y marcas lo que sí quieres guardar."],
  ["Se guarda en tu equipo", "Lo confirmado queda en una base de datos dentro de este navegador. El archivo no se guarda."],
  ["El código calcula y avisa", "Recalcula tu saldo, tu faltante y el orden de pago; de ahí salen los avisos y lo que te explica el copiloto."],
];

const GLOSARIO: readonly (readonly [string, string])[] = [
  ["TCEA", "Tasa de Costo Efectivo Anual: lo que de verdad te cuesta una deuda en un año, contando intereses y comisiones. Mientras más alta, más caro es deber."],
  ["Faltante (déficit)", "El día en que tu saldo proyectado baja de cero y cuánto dinero te falta ese día."],
  ["Saldo proyectado", "Cuánto dinero tendrías cada día de los próximos 30 si entra lo que suele entrar y salen tus gastos y pagos."],
  ["Calificación SBS", "La nota que las entidades le ponen a cada deuda según los días de atraso: Normal, CPP, Deficiente, Dudoso o Pérdida. Mientras más atraso, peor la nota. Aquí solo se muestra una simulación a partir de los días de atraso del caso, no una calificación oficial."],
  ["Jugada", "Un cambio que pruebas antes de hacerlo (por ejemplo, pausar tus suscripciones este mes) para ver cómo cambia tu saldo. No mueve tu dinero real."],
];

/** Pantalla de lectura: una columna, sin tarjetas repetidas. Es contenido fijo; no depende de la base. */
export function ComoFunciona() {
  return (
    <div className="mx-auto max-w-2xl">
      <Portada>
        <p className="text-[15px] text-gris">Cómo funciona</p>
        <h1 className="mt-1 text-[1.75rem] font-semibold leading-tight tracking-[-0.025em] text-noche md:text-[2rem]">
          Los números los calcula el código. La IA solo explica.
        </h1>
        <p className="mt-3 leading-relaxed text-gris">
          Nada se guarda sin que tú lo confirmes, y lo guardado se queda en este navegador. Todo lo que ves es una simulación educativa con datos inventados.
        </p>
      </Portada>

      <section aria-labelledby="recorrido" className="aparecer">
        <h2 id="recorrido" className="text-2xl font-semibold tracking-[-0.025em] text-noche">
          El recorrido de un dato
        </h2>
        <ol className="mt-6">
          {PASOS.map(([titulo, texto], i) => (
            <li key={titulo} className="relative flex gap-4 pb-8 last:pb-0">
              {i < PASOS.length - 1 && <span aria-hidden="true" className="absolute left-[11px] top-7 h-[calc(100%-1.75rem)] w-px bg-linea-fuerte" />}
              <span aria-hidden="true" className="relative mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-electrico bg-white">
                <span className="size-2 rounded-full bg-electrico" />
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold tracking-[-0.015em] text-noche">{titulo}</h3>
                <p className="mt-1 leading-relaxed text-tinta">{texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="glosario" className="mt-14">
        <h2 id="glosario" className="text-2xl font-semibold tracking-[-0.025em] text-noche">
          Palabras que verás
        </h2>
        <dl className="mt-4">
          {GLOSARIO.map(([termino, definicion]) => (
            <div key={termino} className="border-t border-linea py-4 md:grid md:grid-cols-[11rem_1fr] md:gap-6">
              <dt className="font-semibold text-noche">{termino}</dt>
              <dd className="mt-1 leading-relaxed text-tinta md:mt-0">{definicion}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="privacidad" className={`${tarjeta} mt-14 bg-niebla`}>
        <h2 id="privacidad" className="text-lg font-semibold text-noche">
          Tu privacidad
        </h2>
        <ul className="mt-3 space-y-2 leading-relaxed text-tinta">
          <li>Los datos del caso se guardan en este navegador, no en un servidor nuestro.</li>
          <li>En el caso de ejemplo (Andrea, datos inventados), cuando hablas con el copiloto se envía a servicios externos de IA y de voz lo necesario para contestarte: las cifras del caso y tu mensaje. Nosotros no lo guardamos.</li>
          <li>En tu propio caso de simulación, las cifras que escribes no salen de este equipo mientras no actives «IA y voz»: el copiloto responde con reglas. Si la activas, tu caso y tus preguntas viajan a servicios externos de IA y de voz; no pongas datos reales.</li>
          <li>El reporte de ejemplo trae la lectura precargada; solo se guarda lo que tú confirmas.</li>
          <li>Es un prototipo con datos inventados: no escribas datos reales tuyos ni de otras personas. No se piden ni se guardan claves, DNI ni tarjetas.</li>
        </ul>
      </section>
    </div>
  );
}
