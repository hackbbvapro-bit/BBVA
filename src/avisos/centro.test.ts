import { describe, expect, it } from "vitest";
import { aPerfil } from "../datos/aPerfil";
import { datosDeRosa } from "../datos/semilla";
import type { Datos, DeudaGuardada } from "../datos/tipos";
import { analizar } from "../motor";
import { avisosDelCentro, pendientesSinLeer } from "./centro";

function lista(datos: Datos) {
  const perfil = aPerfil(datos);
  return avisosDelCentro(datos, perfil, analizar(perfil));
}

const deuda = (extra: Partial<DeudaGuardada>): DeudaGuardada => ({
  id: "d-x", entidad: "Caja Ejemplo", nombre: "Préstamo Caja", tipo: "personal", saldo: 120000, tceaBp: 3500,
  pagoMinimo: 10000, pagoHabitual: 10000, diaPago: 28, diasAtraso: 0, pagada: false, ...extra,
});

const con = (cambios: Partial<Datos>): Datos => ({ ...datosDeRosa(), ...cambios });

describe("centro de avisos", () => {
  it("con la semilla de Rosa el déficit va primero y es urgente", () => {
    const a = lista(datosDeRosa());
    expect(a[0]).toMatchObject({ id: "deficit", nivel: "urgente", destino: "hoy" });
    expect(a[0].titulo).toContain("S/ 200.00");
    expect(a.every(x => x.clave.length > 0)).toBe(true);
    expect(new Set(a.map(x => x.clave)).size).toBe(a.length);
  });

  it("avisa de la deuda que vence en 3 días o menos, con la fecha y el monto guardados", () => {
    const hoy = datosDeRosa().perfil.hoy;
    const a = lista(con({ deudas: [deuda({ diaPago: 15 })] }));
    const vence = a.find(x => x.id === "vence-d-x");
    expect(hoy).toBe("2026-11-13");
    expect(vence).toMatchObject({ nivel: "atencion", destino: "deudas", fecha: "2026-11-15" });
    expect(vence?.titulo).toBe("Préstamo Caja vence en 2 días");
    expect(vence?.cuerpo).toContain("S/ 100.00");
    expect(lista(con({ deudas: [deuda({ diaPago: 13 })] })).find(x => x.id === "vence-d-x")?.titulo).toBe("Préstamo Caja vence hoy");
    expect(lista(con({ deudas: [deuda({ diaPago: 14 })] })).find(x => x.id === "vence-d-x")?.titulo).toBe("Préstamo Caja vence mañana");
    expect(lista(con({ deudas: [deuda({ diaPago: 17 })] })).some(x => x.id === "vence-d-x")).toBe(false);
  });

  it("no avisa de vencimientos de deudas pagadas ni de saldo cero", () => {
    expect(lista(con({ deudas: [deuda({ diaPago: 14, pagada: true })] })).some(x => x.id === "vence-d-x")).toBe(false);
    expect(lista(con({ deudas: [deuda({ diaPago: 14, saldo: 0 })] })).some(x => x.id === "vence-d-x")).toBe(false);
  });

  it("una deuda con atraso es urgente y pide llamar antes de que empeore", () => {
    const a = lista(con({ deudas: [deuda({ diasAtraso: 12 })] }));
    const atraso = a.find(x => x.id === "atraso-d-x");
    expect(atraso).toMatchObject({ nivel: "urgente", destino: "deudas" });
    expect(atraso?.titulo).toBe("Préstamo Caja: 12 días de atraso");
    expect(atraso?.cuerpo).toContain("Llama a Caja Ejemplo");
    expect(a.some(x => x.id === "vence-d-x")).toBe(false);
  });

  it("solo nombra la calificación de la SBS cuando tiene fuente (Dudoso y Pérdida)", () => {
    const cuerpo = (dias: number) => lista(con({ deudas: [deuda({ diasAtraso: dias })] })).find(x => x.id === "atraso-d-x")?.cuerpo ?? "";
    expect(cuerpo(70)).toContain("Dudoso");
    expect(cuerpo(130)).toContain("Pérdida");
    for (const dias of [1, 10, 40]) expect(cuerpo(dias)).not.toMatch(/CPP|Deficiente|Normal|Dudoso|Pérdida/);
    expect(cuerpo(10)).toContain("peor quedaría su clasificación");
  });

  it("un cobro vencido avisa; uno de hoy, futuro o ya cobrado no", () => {
    const cobro = (id: string, fechaPrometida: string, cobrado = false) => ({ id, quien: "Juan", monto: 5000, fechaPrometida, nota: "", cobrado });
    const a = lista(con({ cobros: [cobro("k1", "2026-11-10"), cobro("k2", "2026-11-13"), cobro("k3", "2026-11-20"), cobro("k4", "2026-11-01", true)] }));
    const ids = a.filter(x => x.id.startsWith("cobro-")).map(x => x.id);
    expect(ids).toEqual(["cobro-k1"]);
    expect(a.find(x => x.id === "cobro-k1")?.titulo).toBe("Juan te debe S/ 50.00 y ya pasó la fecha");
    expect(a.find(x => x.id === "cobro-k1")?.destino).toBe("cobros");
  });

  it("un documento analizado esta semana avisa y lleva al reporte; uno viejo no", () => {
    const doc = (id: string, fecha: string, tipo = "reporte-sbs") => ({ id, tipo, resumen: "5 deudas encontradas", datos: {}, fecha });
    const a = lista(con({ documentos: [doc("x1", "2026-11-13"), doc("x2", "2026-11-01"), doc("x3", "2026-11-12", "recibo")] }));
    expect(a.find(x => x.id === "documento-x1")).toMatchObject({ nivel: "bien", destino: "reporte", cuerpo: "5 deudas encontradas" });
    expect(a.find(x => x.id === "documento-x3")?.destino).toBe("deudas");
    expect(a.some(x => x.id === "documento-x2")).toBe(false);
  });

  it("ordena del más urgente al menos y a igual nivel por fecha", () => {
    const a = lista(con({ deudas: [deuda({ diasAtraso: 3 }), deuda({ id: "d-y", nombre: "Tarjeta Y", diaPago: 14 })] }));
    const niveles = a.map(x => x.nivel);
    const orden = { urgente: 0, atencion: 1, bien: 2 };
    expect(niveles.map(n => orden[n])).toEqual([...niveles.map(n => orden[n])].sort((x, y) => x - y));
  });

  it("no repite el pago del mismo día que ya dice «vence»", () => {
    const holgado = datosDeRosa();
    holgado.cuentas = [{ id: "c", nombre: "Cuenta", saldo: 50_000_000 }];
    holgado.gastosFijos = [{ id: "f1", descripcion: "Gimnasio", monto: 5000, dia: 16, categoria: "suscripciones" }];
    const base = lista(holgado).find(x => x.id === "pago");
    expect(base?.fecha).toBeDefined();
    const dia = Number(base!.fecha!.slice(8));
    const a = lista({ ...holgado, deudas: [...holgado.deudas, deuda({ diaPago: dia })] });
    expect(a.some(x => x.id === "vence-d-x" && x.fecha === base!.fecha)).toBe(true);
    expect(a.some(x => x.id === "pago" && x.fecha === base!.fecha)).toBe(false);
  });

  it("el contador solo cuenta lo que pide atención y aún no se abrió", () => {
    const a = lista(con({ deudas: [deuda({ diasAtraso: 12 })], documentos: [{ id: "x1", tipo: "otro", resumen: "r", datos: {}, fecha: "2026-11-13" }] }));
    const total = a.filter(x => x.nivel !== "bien").length;
    expect(pendientesSinLeer(a, [])).toBe(total);
    expect(pendientesSinLeer(a, [a[0].clave])).toBe(total - 1);
    expect(pendientesSinLeer(a, a.map(x => x.clave))).toBe(0);
  });

  it("cambiar el atraso cambia la clave: vuelve a contar como pendiente", () => {
    const k = (dias: number) => lista(con({ deudas: [deuda({ diasAtraso: dias })] })).find(x => x.id === "atraso-d-x")?.clave;
    expect(k(12)).not.toBe(k(13));
  });
});
