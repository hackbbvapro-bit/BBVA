import { describe, expect, it } from "vitest";
import { PERFILES } from "@/datos/perfiles";
import { analizar } from "@/motor";
import { cifras } from "./tablero";

const perfilDe = (id: string) => {
  const perfil = PERFILES.find(p => p.id === id);
  if (!perfil) throw new Error(`No existe el perfil ${id}`);
  return perfil;
};

describe("indicadores de Inicio", () => {
  it("Andrea: cada cifra dice qué significa y a qué sección lleva", () => {
    const perfil = perfilDe("independiente");
    const [dinero, deuda, minimos, salida] = cifras(perfil, analizar(perfil));
    expect(dinero).toMatchObject({ etiqueta: "Dinero hoy", valor: "S/ 1,168.73", destino: "dinero" });
    // 1 800 + 900 + 4 500 soles de saldo en tres deudas.
    expect(deuda).toMatchObject({ etiqueta: "Deuda total", valor: "S/ 7,200.00", nota: "Lo que debes en 3 deudas", destino: "deudas" });
    // 160 + 80 + 270 soles de mínimos.
    expect(minimos).toMatchObject({ etiqueta: "Pagos mínimos del mes", valor: "S/ 510.00",
      nota: "Lo mínimo para no atrasarte en 3 deudas", destino: "deudas" });
    expect(salida).toMatchObject({ etiqueta: "Salida más barata", valor: "Sin intereses",
      nota: "Pausa tus suscripciones este mes · libera S/ 161.80", destino: "como-evitarlo" });
  });

  it("sin déficit muestra el saldo al final del mes y lleva a la proyección", () => {
    const perfil = perfilDe("dependiente");
    const analisis = analizar(perfil);
    expect(analisis.proyeccion.deficit).toBeNull();
    expect(cifras(perfil, analisis)[3]).toMatchObject({ etiqueta: "Al final del mes", nota: "Si todo sigue como va", destino: "proyeccion" });
  });

  it("sin deudas lo dice en palabras y no inventa mínimos", () => {
    const perfil = { ...perfilDe("independiente"), deudas: [] };
    const [, deuda, minimos] = cifras(perfil, analizar(perfil));
    expect(deuda).toMatchObject({ valor: "S/ 0.00", nota: "No tienes deudas registradas" });
    expect(minimos).toMatchObject({ valor: "S/ 0.00", nota: "Sin pagos mínimos este mes" });
  });

  it("una deuda sin pago mínimo no cuenta en los mínimos", () => {
    const base = perfilDe("independiente");
    const perfil = { ...base, deudas: base.deudas.map((d, i) => (i === 0 ? { ...d, pagoMinimo: 0 } : d)) };
    expect(cifras(perfil, analizar(perfil))[2]).toMatchObject({ valor: "S/ 350.00", nota: "Lo mínimo para no atrasarte en 2 deudas" });
  });
});
