"use client";
import { tarjeta, boton } from "@/componentes/ui";
import { EXTRACCION_EJEMPLO } from "@/documentos/ejemplo";
import { ElegirArchivo, Fallo, Leyendo, Revision, useLecturaDisponible, useSubida } from "@/componentes/subida";

/**
 * Reporte de ejemplo: carga una lectura precargada de un reporte inventado (sin red, sin IA en vivo);
 * lo que se guarda lo decide la persona. Elegir un archivo solo aparece si el servidor tiene encendida la
 * lectura de documentos (apagada por defecto) y la persona permitió IA y voz; aun así debe declarar que el
 * documento es inventado.
 */
export function Adjuntar({ alGuardar }: { alGuardar: () => void }) {
  const { estado, error, elegir, precargada, reiniciar } = useSubida();
  const lectura = useLecturaDisponible();

  return (
    <section className={`${tarjeta} aparecer`} aria-labelledby="adjuntar">
      <h2 id="adjuntar" className="text-lg font-semibold text-noche">
        {estado.paso !== "revisar" ? "Reporte de ejemplo" : estado.ejemplo ? "Reporte de ejemplo, ya leído" : "Esto encontré"}
      </h2>

      {estado.paso === "inicio" && (
        <>
          <p className="mt-1 leading-relaxed text-gris">
            Carga un reporte de deudas inventado para ver cómo el copiloto arma el plan. La lectura está precargada: no es una IA leyendo en vivo. Te muestro lo que trae y tú decides qué guardar.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => precargada(EXTRACCION_EJEMPLO)} className={`${boton} bg-electrico text-white hover:bg-marino`}>
              Cargar reporte de ejemplo
            </button>
          </div>
          <p className="mt-3 text-sm text-gris">Datos sintéticos: ninguna entidad ni persona del reporte es real. El reporte de ejemplo no envía nada fuera de este equipo.</p>
          {lectura && <ElegirArchivo id="archivo-documento" alElegir={(archivo, inventado) => void elegir(archivo, inventado)} />}
        </>
      )}

      {estado.paso === "analizando" && <Leyendo nombre={estado.nombre} alCancelar={reiniciar} />}

      {estado.paso === "revisar" && (
        <Revision
          ext={estado.ext}
          ejemplo={estado.ejemplo}
          alGuardar={() => {
            reiniciar();
            alGuardar();
          }}
          alDescartar={reiniciar}
        />
      )}

      {error && <Fallo texto={error} />}
    </section>
  );
}
