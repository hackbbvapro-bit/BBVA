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
import { TuRuta } from "@/componentes/tu-ruta";
import { armarCaso, tuvoCreditoSegun, type Respuestas } from "@/ruta/entrada";
import { AVISO_SIMULACION, hechosDe, trazarRuta } from "@/ruta/ruta";
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
    it(`pantallas de ${perfil.nombre}, en caso de ejemplo y en caso propio`, () => {
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

describe("la tarjeta «Tu ruta» en Inicio", () => {
  const base: Respuestas = {
    nombre: "Lucho", cobro: "fin_de_mes", ingresoMensual: 320_000, saldo: 90_000,
    fijosMensual: 110_000, diaADiaMensual: 100_000, deuda: null, tuvoCredito: false, hoy: "2026-11-14",
  };
  const casos: Respuestas[] = [
    base,
    { ...base, deuda: { tipo: "tarjeta", saldo: 300_000, cuota: 25_000, atraso: "uno_a_dos_meses" } },
    { ...base, tuvoCredito: true, saldo: 2_000_000 },
  ];

  it("cada ruta se pinta con su título, sus pasos y el aviso de simulación, sin marca de ningún banco", () => {
    for (const r of casos) {
      const datos = armarCaso(r);
      const perfil = aPerfil(datos);
      const analisis = analizar(perfil);
      const ruta = trazarRuta(perfil, analisis, hechosDe(datos, tuvoCreditoSegun(r)));
      const sola = pintar(<TuRuta ruta={ruta} alConversar={nada} />, datos);
      expect(sola).toContain("Conversar con el asistente");
      for (const externo of [true, false]) {
        const html = pintar(<Hoy perfil={perfil} analisis={analisis} demo={false} externo={externo} ruta={ruta} {...voz} />, datos);
        for (const pagina of [sola, html]) {
          expect(pagina).toContain(ruta.titulo);
          expect(pagina).toContain(AVISO_SIMULACION);
          expect(pagina).toContain("Tus pasos, en orden");
          expect(pagina).not.toMatch(/BBVA/i);
        }
        expect(html.includes("Escuchar resumen")).toBe(externo);
      }
    }
  });

  it("sin ruta, Inicio no pinta la tarjeta", () => {
    const perfil = PERFILES[0];
    expect(pintar(<Hoy perfil={perfil} analisis={analizar(perfil)} demo {...voz} />)).not.toContain("Tus pasos, en orden");
  });
});
