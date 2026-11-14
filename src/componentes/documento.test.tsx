import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Adjuntar } from "@/componentes/documento";
import { DatosDePrueba } from "@/componentes/datos";
import { datosDeEjemplo } from "@/datos/semilla";

describe("Adjuntar", () => {
  it("ofrece solo el reporte de ejemplo, con rótulo honesto y sin selector de archivos", () => {
    const html = renderToStaticMarkup(
      <DatosDePrueba datos={datosDeEjemplo()}>
        <Adjuntar alGuardar={() => undefined} />
      </DatosDePrueba>,
    );
    expect(html).toContain("Cargar reporte de ejemplo");
    expect(html).toContain("no es una IA leyendo en vivo");
    expect(html).toContain("Datos sintéticos");
    expect(html).not.toContain('type="file"');
    expect(html).not.toMatch(/BBVA|SBS/);
  });
});
