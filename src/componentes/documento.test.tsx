import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Adjuntar } from "@/componentes/documento";
import { DatosDePrueba } from "@/componentes/datos";
import { datosDeRosa } from "@/datos/semilla";

describe("Adjuntar", () => {
  it("avisa antes de subir que el archivo va a la IA y que la demo es solo con datos inventados", () => {
    const html = renderToStaticMarkup(
      <DatosDePrueba datos={datosDeRosa()}>
        <Adjuntar alGuardar={() => undefined} />
      </DatosDePrueba>,
    );
    expect(html).toContain("aceptas que se envíe a la IA");
    expect(html).toContain("documentos inventados");
  });
});
