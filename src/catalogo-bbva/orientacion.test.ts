import { describe, expect, it } from "vitest";
import { CATALOGO_BBVA, buscarEnCatalogo, menuDelCatalogo, type SituacionPersona } from "./catalogo";
import {
  FRENO_DEFICIT, IDS_CON_CRITERIO, MAX_PARA_TU_SITUACION, SENALES, avisosDe, criterioDe, encajeDe, enPausaConDeficit, paraTuSituacion,
  type Senal,
} from "./orientacion";

const producto = (id: string) => {
  const p = CATALOGO_BBVA.productos.find(x => x.id === id);
  if (!p) throw new Error(`No existe ${id}`);
  return p;
};
const vigentes = CATALOGO_BBVA.productos.filter(p => p.estado !== "no_encontrado");
const situacion = (...senales: Senal[]): SituacionPersona => ({ senales: senales.map(senal => ({ senal, por_que: "prueba" })) });

describe("criterio: reglas del equipo, separadas de los datos oficiales", () => {
  it("cada id con criterio propio existe en el catálogo y está vigente", () => {
    for (const id of IDS_CON_CRITERIO) {
      expect(vigentes.map(p => p.id), id).toContain(id);
    }
  });

  it("el criterio no trae montos, tasas ni porcentajes: las cifras solo salen de la web oficial", () => {
    const textos = vigentes.flatMap(p => {
      const c = criterioDe(p);
      return c ? [c.cuando_si, c.cuando_no] : [];
    }).concat(vigentes.flatMap(avisosDe));
    for (const t of textos) expect(t).not.toMatch(/S\/|\d|%/);
  });

  it("todas las señales de los criterios existen", () => {
    for (const p of vigentes) for (const s of criterioDe(p)?.senales ?? []) expect(SENALES).toContain(s);
  });

  it("los seguros y los fondos tienen criterio por familia; los servicios no tienen", () => {
    const seguro = vigentes.find(p => p.familia === "seguros")!;
    const fondo = vigentes.find(p => p.familia === "inversiones" && p.subfamilia === "fondo-agresivo")!;
    expect(criterioDe(seguro)?.solo_informar).toBe(true);
    expect(criterioDe(fondo)?.senales).toEqual(["excedente_estable"]);
    expect(criterioDe(producto("plin"))).toBeNull();
  });
});

describe("freno por déficit: con un día en rojo solo se habla de liquidez", () => {
  it("frena seguros, fondos, tarjetas, préstamos de consumo e hipotecarios", () => {
    for (const id of ["visa-cero", "prestamo-al-toque", "credito-hipotecario-bbva", "deposito-a-plazo"]) {
      expect(enPausaConDeficit(producto(id)), id).toBe(true);
    }
    expect(vigentes.filter(p => p.familia === "seguros").every(enPausaConDeficit)).toBe(true);
  });

  it("no frena el adelanto de sueldo, la compra de deuda ni las cuentas", () => {
    for (const id of ["adelanto-de-sueldo", "compra-de-deuda", "prestamo-compra-de-deuda", "cuenta-digital", "plin"]) {
      expect(enPausaConDeficit(producto(id)), id).toBe(false);
    }
  });

  it("el freno solo aparece si hay déficit", () => {
    expect(encajeDe(producto("visa-cero"), new Set(["deficit_proyectado"])).freno).toBe(FRENO_DEFICIT);
    expect(encajeDe(producto("visa-cero"), new Set()).freno).toBeUndefined();
  });
});

describe("encaje de un producto con la situación", () => {
  it("adelanto de sueldo con déficit: encaja, pero falta confirmar que cobra en BBVA", () => {
    const e = encajeDe(producto("adelanto-de-sueldo"), new Set(["deficit_proyectado"]));
    expect(e.encaja_con_tu_situacion).toEqual(["su saldo proyectado cae bajo cero en los próximos días"]);
    expect(e.falta_confirmar).toEqual(["cobra su sueldo en BBVA"]);
    expect(e.freno).toBeUndefined();
  });

  it("si la persona ya dijo que cobra en BBVA, no se le vuelve a preguntar", () => {
    const e = encajeDe(producto("adelanto-de-sueldo"), new Set(["deficit_proyectado", "cobra_sueldo_bbva"]));
    expect(e.falta_confirmar).toBeUndefined();
    expect(e.encaja_con_tu_situacion).toHaveLength(2);
  });

  it("a un independiente el adelanto de sueldo no le aplica, aunque tenga déficit", () => {
    const e = encajeDe(producto("adelanto-de-sueldo"), new Set(["deficit_proyectado", "sin_planilla"]));
    expect(e.encaja_con_tu_situacion).toBeUndefined();
    expect(e.falta_confirmar).toBeUndefined();
    expect(e.no_aplica).toEqual(["trabaja como independiente: no cobra un sueldo de planilla"]);
    const menu = menuDelCatalogo(undefined, undefined, situacion("deficit_proyectado", "sin_planilla"));
    expect(menu.para_tu_situacion!.map(s => s.nombre)).not.toContain(producto("adelanto-de-sueldo").nombre);
  });

  it("sin señales que encajen no se pide confirmar nada", () => {
    expect(encajeDe(producto("adelanto-de-sueldo"), new Set()).falta_confirmar).toBeUndefined();
  });

  it("un producto de «solo informar» nunca encaja por iniciativa propia", () => {
    const e = encajeDe(producto("bbva-bolsa"), new Set(["excedente_estable"]));
    expect(e.solo_informar).toBe(true);
    expect(e.encaja_con_tu_situacion).toBeUndefined();
  });
});

describe("avisos por tipo de producto", () => {
  it("crédito: evaluación del banco y TCEA; fondo: puede bajar y sin fondo de depósitos; cuenta: fondo de depósitos y TREA", () => {
    expect(avisosDe(producto("prestamo-al-toque")).join(" ")).toMatch(/evaluación crediticia.*TCEA/);
    expect(avisosDe(producto("tarjeta-start")).join(" ")).toMatch(/evaluación crediticia/);
    const fondo = vigentes.find(p => p.subfamilia === "fondo-conservador")!;
    expect(avisosDe(fondo).join(" ")).toMatch(/subir o bajar.*no lo cubre el Fondo de Seguro de Depósitos/);
    expect(avisosDe(producto("cuenta-digital")).join(" ")).toMatch(/Fondo de Seguro de Depósitos.*TREA/);
    expect(avisosDe(producto("deposito-a-plazo")).join(" ")).toMatch(/Fondo de Seguro de Depósitos/);
    expect(avisosDe(producto("plin"))).toEqual([]);
  });
});

describe("el catálogo con la situación de la persona", () => {
  it("el menú propone solo productos con encaje, sin freno, y como máximo seis", () => {
    const sugeridos = paraTuSituacion(vigentes, new Set(SENALES));
    expect(sugeridos.length).toBeLessThanOrEqual(MAX_PARA_TU_SITUACION);
    const nombresFrenados = vigentes.filter(enPausaConDeficit).map(p => p.nombre);
    for (const s of sugeridos) expect(nombresFrenados).not.toContain(s.nombre);
  });

  it("con déficit, el menú sugiere el adelanto de sueldo y ninguna tarjeta ni seguro", () => {
    const menu = menuDelCatalogo(undefined, undefined, situacion("deficit_proyectado", "deuda_cara"));
    const nombres = menu.para_tu_situacion!.map(s => s.nombre);
    expect(nombres).toContain(producto("adelanto-de-sueldo").nombre);
    expect(nombres).toContain(producto("compra-de-deuda").nombre);
    expect(nombres).not.toContain(producto("prestamo-al-toque").nombre);
    expect(menu.tu_situacion).toHaveLength(2);
    expect(menu.reglas?.length).toBeGreaterThan(0);
  });

  it("con excedente, sugiere ahorro e inversión, y la búsqueda marca el encaje en la ficha", () => {
    const menu = menuDelCatalogo("inversiones", undefined, situacion("excedente_estable"));
    expect(menu.para_tu_situacion!.length).toBeGreaterThan(0);
    const { encontrados } = buscarEnCatalogo("depósito a plazo", undefined, undefined, situacion("excedente_estable"));
    const plazo = encontrados.find(f => f.nombre === producto("deposito-a-plazo").nombre);
    expect(plazo?.encaja_con_tu_situacion).toHaveLength(1);
    expect(plazo?.avisos?.length).toBeGreaterThan(0);
  });

  it("sin situación, el catálogo responde como antes (sin tu_situacion ni para_tu_situacion)", () => {
    const menu = menuDelCatalogo();
    expect("para_tu_situacion" in menu).toBe(false);
    expect("tu_situacion" in menu).toBe(false);
    const { encontrados } = buscarEnCatalogo("visa cero");
    expect(encontrados[0].cuando_no).toMatch(/cuotas/);
  });

  it("la búsqueda con déficit frena una tarjeta y lo dice en la ficha", () => {
    const { encontrados } = buscarEnCatalogo("visa cero", undefined, undefined, situacion("deficit_proyectado"));
    expect(encontrados[0].freno).toBe(FRENO_DEFICIT);
  });
});
