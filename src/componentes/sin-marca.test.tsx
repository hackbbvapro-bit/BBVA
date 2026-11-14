"use client";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PERFILES } from "@/datos/perfiles";
import { analizar } from "@/motor";
import { aPerfil } from "@/datos/aPerfil";
import { datosDeRosa } from "@/datos/semilla";
import { DatosDePrueba } from "@/componentes/datos";
import { Hoy } from "@/componentes/hoy";
import { Deudas } from "@/componentes/deudas";
import { Chat } from "@/componentes/chat";
import { Bienvenida } from "@/componentes/bienvenida";
import { Recomendaciones } from "@/componentes/recomendaciones";
import { Adjuntar } from "@/componentes/documento";
import { ComoFunciona } from "@/componentes/como-funciona";
import { Perfil } from "@/componentes/perfil";
import { MenuUsuario } from "@/componentes/menu-usuario";
import { MiDinero } from "@/componentes/mi-dinero";
import { LoQueSe } from "@/componentes/lo-que-se";
import { Marca } from "@/componentes/ui";

const voz = { leer: () => undefined, detener: () => undefined, sonando: false };
const nada = () => undefined;

/** Texto visible e invisible (atributos incluidos) de una vista, envuelta en los datos sintéticos de Rosa. */
function pintar(vista: ReactElement, datos = datosDeRosa()) {
  return renderToStaticMarkup(<DatosDePrueba datos={datos}>{vista}</DatosDePrueba>);
}

describe("la interfaz no usa la marca de ningún banco", () => {
  for (const perfil of PERFILES) {
    it(`pantallas de ${perfil.nombre}, en caso de ejemplo y de práctica`, () => {
      const analisis = analizar(perfil);
      for (const demo of [true, false]) {
        for (const vista of [
          <Hoy key="hoy" perfil={perfil} analisis={analisis} demo={demo} {...voz} />,
          <Chat key="chat" perfil={perfil} analisis={analisis} demo={demo} {...voz} />,
          <Deudas key="debo" perfil={perfil} analisis={analisis} />,
          <Deudas key="medeben" perfil={perfil} analisis={analisis} pestanaInicial="medeben" />,
          <Deudas key="sbs" perfil={perfil} analisis={analisis} pestanaInicial="sbs" />,
          <Deudas key="escaner" perfil={perfil} analisis={analisis} abrirAlEntrar="escanear" />,
          <MiDinero key="dinero" analisis={analisis} />,
          <LoQueSe key="loquese" analisis={analisis} />,
          <MenuUsuario key="menu" nombre={perfil.nombre} variante="lateral" alPerfil={nada} alComoFunciona={nada} demo={demo} />,
        ]) {
          const html = pintar(vista);
          expect(html.length).toBeGreaterThan(0);
          expect(html).not.toMatch(/BBVA/i);
        }
      }
    });
  }

  it("bienvenida, cómo funciona, perfil, reporte de ejemplo y marca del prototipo", () => {
    for (const vista of [
      <Bienvenida key="bienvenida" alListo={nada} />,
      <ComoFunciona key="como" />,
      <Perfil key="perfil" />,
      <Adjuntar key="adjuntar" alGuardar={nada} />,
      <Marca key="marca" />,
    ]) {
      const html = pintar(vista);
      expect(html.length).toBeGreaterThan(0);
      expect(html).not.toMatch(/BBVA/i);
    }
  });

  it("alternativas genéricas: con un atraso aparecen y siguen sin marca", () => {
    const datos = datosDeRosa();
    datos.cuentas = [{ id: "c", nombre: "Cuenta", saldo: 900_000_000 }];
    datos.deudas = datos.deudas.map((d, i) => (i === 0 ? { ...d, diasAtraso: 12 } : d));
    const analisis = analizar(aPerfil(datos));
    analisis.proyeccion = { ...analisis.proyeccion, deficit: null };
    const html = pintar(<Recomendaciones datos={datos} analisis={analisis} />, datos);
    expect(html).toContain("Alternativas que puedes consultar");
    expect(html).not.toMatch(/BBVA/i);
  });
});
