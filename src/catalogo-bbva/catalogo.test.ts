import { describe, expect, it } from "vitest";
import { CATALOGO_BBVA, FAMILIAS, MAX_RESULTADOS, buscarEnCatalogo, menuDelCatalogo, type CatalogoBbva, type ProductoBbva } from "./catalogo";

const base: ProductoBbva = {
  id: "x", nombre: "X", familia: "cuentas", subfamilia: "Ahorro", para_que_sirve: "Guardar", para_quien: "",
  beneficios: [], requisitos: [], cifras_oficiales: ["Membresía: S/ 0"], sin_cifras_publicadas: false, moneda: ["PEN"],
  url_oficial: "https://www.bbva.pe/x.html", estado: "vigente", notas: "",
};
const prueba: CatalogoBbva = {
  fecha_consulta: "2026-11-14", fuente: "Prueba", aviso: "Aviso",
  productos: [
    { ...base, id: "cuenta-viva", nombre: "Cuenta Viva" },
    { ...base, id: "cuenta-retirada", nombre: "Cuenta Retirada", estado: "no_encontrado" },
    { ...base, id: "seguro-sin-precio", nombre: "Seguro Sin Precio", familia: "seguros", cifras_oficiales: [], sin_cifras_publicadas: true, notas: "La web no publica la prima." },
  ],
};

describe("catálogo de BBVA copiado de la web oficial", () => {
  it("carga validado, con fecha, ids únicos y solo enlaces de bbva.pe", () => {
    expect(CATALOGO_BBVA.fecha_consulta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(CATALOGO_BBVA.productos.length).toBeGreaterThanOrEqual(90);
    for (const p of CATALOGO_BBVA.productos) {
      expect(p.url_oficial).toMatch(/^https:\/\/(www\.bbva\.pe|fondos\.bbva\.pe)\//);
      expect(p.sin_cifras_publicadas).toBe(p.cifras_oficiales.length === 0);
    }
  });

  it("el menú cubre las siete familias y cuenta lo que lista", () => {
    const menu = menuDelCatalogo();
    expect(menu.familias).toHaveLength(FAMILIAS.length);
    expect(menu.total_productos).toBe(menu.familias.reduce((n, f) => n + f.productos.length, 0));
    expect(menu.consultado_el).toBe(CATALOGO_BBVA.fecha_consulta);
  });

  it("«tarjeta sin membresía» encuentra la Visa Cero", () => {
    const r = buscarEnCatalogo("tarjeta sin membresía");
    expect(r.encontrados.map(f => f.nombre).join(" ")).toMatch(/Cero/i);
  });

  it("«crédito para casa» encuentra un hipotecario", () => {
    const r = buscarEnCatalogo("crédito para casa");
    expect(r.encontrados.some(f => /hipotecario|vivienda/i.test(`${f.nombre} ${f.tipo}`))).toBe(true);
  });

  it("nunca devuelve más de cuatro fichas", () => {
    expect(buscarEnCatalogo("seguro").encontrados.length).toBeLessThanOrEqual(MAX_RESULTADOS);
  });

  it("lo que la web ya no publica no se ofrece, ni en el menú ni en la búsqueda", () => {
    expect(JSON.stringify(menuDelCatalogo(undefined, prueba))).not.toContain("Retirada");
    expect(buscarEnCatalogo("cuenta", undefined, prueba).encontrados.map(f => f.nombre)).toEqual(["Cuenta Viva"]);
  });

  it("sin cifras publicadas manda a cotizar en vez de inventar, y pasa el «ojo»", () => {
    const [f] = buscarEnCatalogo("seguro", undefined, prueba).encontrados;
    expect(f.cifras_oficiales).toContain("hay que cotizarlo");
    expect(f.ojo).toBe("La web no publica la prima.");
  });

  it("las cifras se copian tal cual, sin tocar", () => {
    const [f] = buscarEnCatalogo("cuenta viva", undefined, prueba).encontrados;
    expect(f.cifras_oficiales).toEqual(["Membresía: S/ 0"]);
    expect(f.enlace_oficial).toBe("https://www.bbva.pe/x.html");
  });

  it("si nada encaja lo dice y sugiere el menú", () => {
    const r = buscarEnCatalogo("zzzz qqqq");
    expect(r.encontrados).toEqual([]);
    expect(r).toHaveProperty("nota");
  });

  it("respeta el filtro de familia", () => {
    const r = buscarEnCatalogo("seguro", "cuentas", prueba);
    expect(r.encontrados.every(f => f.tipo.startsWith("Cuentas"))).toBe(true);
  });
});
