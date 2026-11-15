import { describe, expect, it } from "vitest";
import { PERFILES } from "../datos/perfiles";
import { analizar, simularGasto } from "../motor";
import { aPerfil } from "../datos/aPerfil";
import { armarCaso, tuvoCreditoSegun, type Respuestas } from "../ruta/entrada";
import { AVISO_SIMULACION, hechosDe, trazarRuta } from "../ruta/ruta";
import { datosDeudas, datosJugadas, datosProximosPagos, datosResumen, datosRuta, datosSimulacion } from "./datos";

const porId = (id: string) => {
  const perfil = PERFILES.find(p => p.id === id);
  if (!perfil) throw new Error(`No existe el perfil ${id}`);
  return { perfil, analisis: analizar(perfil) };
};

describe("datos que ve el agente", () => {
  it("no dejan pasar NaN, undefined ni montos sin formato en ningún perfil", () => {
    for (const perfil of PERFILES) {
      const analisis = analizar(perfil);
      const todo = JSON.stringify([
        datosResumen(perfil, analisis), datosJugadas(analisis), datosDeudas(perfil, analisis),
        datosProximosPagos(analisis, 30), datosSimulacion(analisis, 150, analisis.hoy),
      ]);
      expect(todo).not.toMatch(/NaN|undefined|Infinity|null,null/);
      expect(todo).toContain("S/ ");
    }
  });

  it("el resumen de Andrea dice el día y el monto exactos del déficit", () => {
    const { perfil, analisis } = porId("independiente");
    const resumen = datosResumen(perfil, analisis);
    expect(resumen.deficit?.primer_dia_en_negativo).toBe("lunes 23 de noviembre");
    expect(resumen.deficit?.cuanto_falta_ese_dia).toBe("S/ 119.07");
    expect(resumen.deficit?.causas.length).toBeGreaterThan(0);
  });

  it("Carlos no tiene déficit ni jugadas que proponer", () => {
    const { perfil, analisis } = porId("dependiente");
    expect(datosResumen(perfil, analisis).deficit).toBeNull();
    expect(datosJugadas(analisis).hay_deficit).toBe(false);
  });

  it("las jugadas de Andrea llevan costo y señalan la más barata que resuelve", () => {
    const { analisis } = porId("independiente");
    const jugadas = datosJugadas(analisis);
    expect(jugadas.hay_deficit).toBe(true);
    expect(jugadas.jugadas?.length).toBe(analisis.jugadas.length);
    for (const j of jugadas.jugadas ?? []) {
      expect(j.cuesta).toMatch(/^cuesta S\/ |^cuesta unos S\/ .+ \(estimado\)$|^no cuesta dinero$|^no genera intereses, pero revisa|^no sabemos cuánto cuesta/);
      expect(["conocido", "estimado", "desconocido"]).toContain(j.certeza_del_costo);
      expect(["elimina", "reduce", "posterga", "no_mejora"]).toContain(j.efecto_sobre_el_deficit);
      // «No cuesta dinero» solo cuando el costo se conoce de verdad.
      if (j.cuesta === "no cuesta dinero") expect(j.certeza_del_costo).toBe("conocido");
    }
    // Pausar suscripciones no genera intereses, pero no sabemos si alguna cobra por cancelar: no es «gratis».
    const pausar = jugadas.jugadas!.find(j => j.titulo === "Pausa tus suscripciones este mes")!;
    expect(pausar).toMatchObject({ certeza_del_costo: "estimado", cuesta: "no genera intereses, pero revisa si cobran algún cargo" });
  });

  it("las deudas van de mayor a menor TCEA y la primera es la que hay que atacar", () => {
    for (const perfil of PERFILES.filter(p => p.deudas.length > 0)) {
      const deudas = datosDeudas(perfil, analizar(perfil));
      const masCara = [...perfil.deudas].sort((a, b) => b.tceaBp - a.tceaBp)[0];
      expect(deudas.pagar_primero).toBe(masCara.nombre);
      expect(deudas.deudas_de_mayor_a_menor_tcea?.[0].nombre).toBe(masCara.nombre);
      expect(deudas.deudas_de_mayor_a_menor_tcea?.length).toBe(perfil.deudas.length);
    }
  });

  it("enseña qué pasa con el pago mínimo, con las cifras del motor y las consecuencias de no pagar", () => {
    const { perfil, analisis } = porId("independiente");
    const educacion = datosDeudas(perfil, analisis).educacion!;
    const azul = educacion.pago_minimo_por_tarjeta[0];
    expect(azul.tarjeta).toBe("Tarjeta Azul");
    expect(azul.pago_minimo).toBe("S/ 160.00");
    // 180000 × (2^(30/360) − 1) = 10 703 céntimos de interés; el resto del mínimo baja la deuda.
    expect(azul.del_minimo_se_va_en_intereses_el_primer_mes).toBe("S/ 107.03");
    expect(azul.del_minimo_baja_la_deuda_el_primer_mes).toBe("S/ 52.97");
    expect(azul.pagando_solo_el_minimo.termina).toBe(true);
    expect(azul.pagando_lo_que_suele_pagar?.suele_pagar).toBe("S/ 600.00");
    expect(educacion.si_pagas_solo_el_minimo.join(" ")).toMatch(/mejor que no pagar/);
    expect(educacion.si_no_pagas_nada.join(" ")).toMatch(/central de riesgos/);
    expect(educacion.para_salir.join(" ")).toMatch(/ANTES de la fecha de pago/);
    expect(educacion.glosario.map(t => t.termino)).toContain("Pago mínimo");
  });

  it("el ahorro frente a los mínimos se explica como pagar más, no solo como el orden", () => {
    const { perfil, analisis } = porId("independiente");
    expect(datosDeudas(perfil, analisis).de_donde_sale_el_ahorro).toMatch(/No sale solo del orden/);
  });

  it("una deuda sin tasa conocida no recibe cifras inventadas del mínimo", () => {
    const { perfil, analisis } = porId("independiente");
    const sinTasa = { ...perfil, deudas: perfil.deudas.map(d => ({ ...d, tceaBp: 0 })) };
    expect(datosDeudas(sinTasa, analisis).educacion?.pago_minimo_por_tarjeta).toEqual([]);
  });

  it("los próximos pagos se muestran como montos positivos", () => {
    const { analisis } = porId("independiente");
    for (const pago of datosProximosPagos(analisis, 30).pagos) expect(pago.monto).toMatch(/^S\/ /);
  });
});

describe("simular un gasto", () => {
  const { analisis } = porId("dependiente");

  it("pasa los soles a céntimos enteros sin errores de decimales", () => {
    expect(datosSimulacion(analisis, 19.99, analisis.hoy)).toMatchObject({ gasto: "S/ 19.99" });
    expect(datosSimulacion(analisis, 0.07, analisis.hoy)).toMatchObject({ gasto: "S/ 0.07" });
    expect(datosSimulacion(analisis, 1234.56, analisis.hoy)).toMatchObject({ gasto: "S/ 1,234.56" });
  });

  it("el máximo que informa es exactamente el límite: alcanza con él y no con un céntimo más", () => {
    const maximo = simularGasto(analisis.proyeccion, analisis.proyeccion.desde, 100).maximoSinDeficit;
    expect(maximo).toBeGreaterThan(0);
    expect(datosSimulacion(analisis, maximo / 100, analisis.hoy)).toMatchObject({ alcanza: true });
    const pasado = datosSimulacion(analisis, (maximo + 1) / 100, analisis.hoy);
    expect(pasado).toMatchObject({ alcanza: false });
    expect(JSON.stringify(pasado)).toContain("No alcanza");
  });

  it("devuelve un error legible, sin lanzar, con montos o fechas que no valen", () => {
    for (const monto of [0, -5, Number.NaN, Number.POSITIVE_INFINITY, 2_000_000]) {
      expect(datosSimulacion(analisis, monto, analisis.hoy)).toHaveProperty("error");
    }
    for (const fecha of ["2020-01-01", "2026-02-30", "mañana", "2099-12-31"]) {
      expect(datosSimulacion(analisis, 50, fecha)).toHaveProperty("error");
    }
  });

  it("un gasto hecho hoy cuenta igual que uno hecho el primer día proyectado, y se nombra como hoy", () => {
    const hoy = datosSimulacion(analisis, 80, analisis.hoy);
    const manana = datosSimulacion(analisis, 80, analisis.proyeccion.desde);
    expect(hoy).toMatchObject({ dia_del_gasto: "viernes 13 de noviembre", alcanza: true });
    expect({ ...hoy, dia_del_gasto: "" }).toEqual({ ...manana, dia_del_gasto: "" });
  });
});

describe("la ruta que ve el agente", () => {
  const base: Respuestas = {
    nombre: "Lucho", cobro: "fin_de_mes", ingresoMensual: 320_000, saldo: 90_000,
    fijosMensual: 110_000, diaADiaMensual: 100_000, deuda: null, tuvoCredito: false, hoy: "2026-11-14",
  };
  const rutaDe = (r: Respuestas) => {
    const datos = armarCaso(r);
    const perfil = aPerfil(datos);
    return trazarRuta(perfil, analizar(perfil), hechosDe(datos, tuvoCreditoSegun(r)));
  };
  const rutas = [
    rutaDe(base),
    rutaDe({ ...base, deuda: { tipo: "tarjeta", saldo: 300_000, cuota: 25_000, atraso: "uno_a_dos_meses" } }),
    rutaDe({ ...base, tuvoCredito: true, saldo: 2_000_000 }),
    rutaDe({ ...base, ingresoMensual: 100_000 }),
  ];

  it("cubre las tres rutas", () => {
    expect(new Set(rutas.map(r => r.id))).toEqual(new Set(["construir_historial", "estar_en_verde", "hacer_crecer"]));
  });

  it("no deja pasar NaN, undefined ni montos sin formato, y siempre lleva el aviso de simulación", () => {
    for (const ruta of rutas) {
      const d = datosRuta(ruta);
      const todo = JSON.stringify(d);
      expect(todo).not.toMatch(/NaN|undefined|Infinity|null/);
      expect(todo).not.toMatch(/BBVA/i);
      expect(d.aviso).toBe(AVISO_SIMULACION);
      expect(d.pasos).toEqual(ruta.pasos);
      for (const a of d.alternativas_para_comparar) {
        expect(a.que_preguntar_en_su_banco.length).toBeGreaterThan(0);
        for (const q of a.que_preguntar_en_su_banco) expect(q).not.toMatch(/\d|%/);
      }
      for (const monto of [...Object.values(d.flujo_mensual).slice(0, 4), d.colchon_para_imprevistos.meta, d.colchon_para_imprevistos.falta]) {
        expect(monto).toMatch(/^-?S\/ [\d,]+\.\d{2}$/);
      }
    }
  });

  it("si no queda nada libre al mes lo dice con palabras en vez de inventar un plazo", () => {
    const sinLibre = rutas.find(r => r.colchon.mesesParaCompletar === undefined || r.colchon.mesesParaCompletar === null);
    if (sinLibre) expect(typeof datosRuta(sinLibre).colchon_para_imprevistos.meses_para_completarlo).toBe("string");
  });
});
