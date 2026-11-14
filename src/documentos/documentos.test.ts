import { describe, expect, it } from "vitest";
import { EXTRACCION_EJEMPLO } from "./ejemplo";
import { Extraccion, soles_a_centimos } from "./esquema";
import { interpretarRespuesta } from "./extraer";
import { MAXIMO_ARCHIVO_BYTES, validarArchivo } from "./validar";

const base64 = (bytes: number[], total = bytes.length) =>
  Buffer.from([...bytes, ...new Array(Math.max(0, total - bytes.length)).fill(0)]).toString("base64");
const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d];

describe("soles_a_centimos", () => {
  it("redondea al céntimo entero sin deriva de float", () => {
    expect(soles_a_centimos(19.99)).toBe(1999);
    expect(soles_a_centimos(0.1 + 0.2)).toBe(30);
    expect(soles_a_centimos(1.005)).toBe(101);
    expect(soles_a_centimos(4800)).toBe(480000);
    expect(soles_a_centimos(0)).toBe(0);
    expect(soles_a_centimos(-12.35)).toBe(-1235);
    expect(soles_a_centimos(-1.005)).toBe(-101);
    expect(soles_a_centimos(1234567.89)).toBe(123456789);
  });
  it("rechaza números no finitos", () => {
    expect(() => soles_a_centimos(NaN)).toThrow(RangeError);
    expect(() => soles_a_centimos(Infinity)).toThrow(RangeError);
  });
});

describe("esquema Extraccion", () => {
  const con = (cambio: Record<string, unknown>) => ({
    ...EXTRACCION_EJEMPLO,
    deudas: [{ ...EXTRACCION_EJEMPLO.deudas[0], ...cambio }],
  });

  it("acepta EXTRACCION_EJEMPLO", () => {
    expect(Extraccion.safeParse(EXTRACCION_EJEMPLO).success).toBe(true);
    expect(EXTRACCION_EJEMPLO.deudas).toHaveLength(5);
  });
  it("acepta los datos desconocidos como null", () => {
    const r = Extraccion.safeParse(
      con({ calificacion: null, diasAtraso: null, pagoMinimo: null, tcea: null, diaPago: null }),
    );
    expect(r.success).toBe(true);
  });
  it("rechaza saldo negativo, con más de 2 decimales o no numérico", () => {
    expect(Extraccion.safeParse(con({ saldo: -1 })).success).toBe(false);
    expect(Extraccion.safeParse(con({ saldo: 10.005 })).success).toBe(false);
    expect(Extraccion.safeParse(con({ saldo: "2350" })).success).toBe(false);
    expect(Extraccion.safeParse(con({ saldo: 19.99 })).success).toBe(true);
  });
  it("rechaza tipo desconocido y calificación inválida", () => {
    expect(Extraccion.safeParse({ ...EXTRACCION_EJEMPLO, tipo: "pagare" }).success).toBe(false);
    expect(Extraccion.safeParse(con({ calificacion: "excelente" })).success).toBe(false);
    expect(Extraccion.safeParse(con({ producto: "hipoteca" })).success).toBe(false);
  });
  it("respeta los topes de tamaño", () => {
    const deuda = EXTRACCION_EJEMPLO.deudas[0];
    expect(Extraccion.safeParse({ ...EXTRACCION_EJEMPLO, deudas: Array(31).fill(deuda) }).success).toBe(false);
    expect(Extraccion.safeParse({ ...EXTRACCION_EJEMPLO, resumen: "x".repeat(301) }).success).toBe(false);
  });
  it("valida fechas AAAA-MM-DD en movimientos y cobros", () => {
    const mov = (fecha: string | null) => ({
      ...EXTRACCION_EJEMPLO,
      movimientos: [{ fecha, descripcion: "Supermercado", monto: -45.5 }],
    });
    expect(Extraccion.safeParse(mov("2026-10-03")).success).toBe(true);
    expect(Extraccion.safeParse(mov(null)).success).toBe(true);
    expect(Extraccion.safeParse(mov("03/10/2026")).success).toBe(false);
  });
});

describe("interpretarRespuesta", () => {
  it("lee el JSON aunque venga en un bloque de código", () => {
    const texto = "```json\n" + JSON.stringify(EXTRACCION_EJEMPLO) + "\n```";
    expect(interpretarRespuesta(texto)).toEqual(EXTRACCION_EJEMPLO);
  });
  it("devuelve undefined si no es JSON o no cumple el esquema", () => {
    expect(interpretarRespuesta("no puedo ayudar")).toBeUndefined();
    expect(interpretarRespuesta('{"tipo":"otro"}')).toBeUndefined();
  });
});

describe("validarArchivo", () => {
  it("acepta JPEG, PNG, WEBP y PDF con su firma correcta", () => {
    expect(validarArchivo("image/jpeg", base64(JPEG)).ok).toBe(true);
    expect(validarArchivo("image/png", base64(PNG)).ok).toBe(true);
    expect(validarArchivo("image/webp", base64(WEBP)).ok).toBe(true);
    expect(validarArchivo("application/pdf", base64(PDF)).ok).toBe(true);
  });
  it("415 si el tipo no está permitido", () => {
    for (const tipo of ["image/gif", "text/html", "application/zip", ""]) {
      expect(validarArchivo(tipo, base64(PNG))).toMatchObject({ ok: false, estado: 415 });
    }
  });
  it("413 si el archivo decodificado pesa más de 4 MB", () => {
    expect(validarArchivo("image/png", base64(PNG, MAXIMO_ARCHIVO_BYTES + 1))).toMatchObject({
      ok: false,
      estado: 413,
    });
    expect(validarArchivo("image/png", base64(PNG, MAXIMO_ARCHIVO_BYTES)).ok).toBe(true);
  });
  it("400 si la firma no coincide con el tipo declarado", () => {
    expect(validarArchivo("image/png", base64(JPEG))).toMatchObject({ ok: false, estado: 400 });
    expect(validarArchivo("application/pdf", base64(PNG))).toMatchObject({ ok: false, estado: 400 });
    expect(validarArchivo("image/webp", base64([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x41, 0x56, 0x49, 0x20]))).toMatchObject({
      ok: false,
      estado: 400,
    });
  });
  it("400 si el base64 es inválido o está vacío", () => {
    expect(validarArchivo("image/png", "")).toMatchObject({ ok: false, estado: 400 });
    expect(validarArchivo("image/png", "###no-es-base64###")).toMatchObject({ ok: false, estado: 400 });
  });
});
