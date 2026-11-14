import { describe, expect, it } from "vitest";
import { sumar } from "@/motor/dinero";
import { diasEntre, sumarDias } from "@/motor/fechas";
import { casoDeRosa, clientesDelDataset } from "./casos-agente";
import { saldosReales } from "./poblacion";
import { inicioDeHistoria, porSemana, saldoDiario } from "./series";

const casos = [casoDeRosa(), ...clientesDelDataset()];

describe("saldoDiario", () => {
  it("trae un punto por día, sin huecos, y pasa por el saldo del corte", () => {
    for (const { cliente, nombre } of casos) {
      const puntos = saldoDiario(cliente);
      for (let i = 1; i < puntos.length; i++) expect(puntos[i].fecha, nombre).toBe(sumarDias(puntos[i - 1].fecha, 1));
      expect(puntos[0].fecha, nombre).toBe(inicioDeHistoria(cliente));
      expect(puntos.find(p => p.fecha === cliente.corte)?.saldo, nombre).toBe(cliente.saldoCorte);
      expect(puntos.every(p => Number.isSafeInteger(p.saldo)), nombre).toBe(true);
      expect(puntos.filter(p => !p.futuro), nombre).toHaveLength(diasEntre(inicioDeHistoria(cliente), cliente.corte) + 1);
    }
  });

  it("hacia atrás llega exactamente al saldo de apertura", () => {
    for (const { cliente, nombre } of casos) {
      const [primero] = saldoDiario(cliente);
      const delPrimerDia = porSemana(cliente); // solo para asegurar que ambas series parten del mismo día
      expect(delPrimerDia[0].desde, nombre).toBe(primero.fecha);
      const movidoElPrimerDia = [...cliente.historia, ...cliente.ocultos]
        .filter(m => m.fecha === primero.fecha && m.canal !== "tarjeta" && m.tipoDuplicado !== "registro_repetido")
        .map(m => m.monto);
      expect(primero.saldo - sumar(movidoElPrimerDia), nombre).toBe(cliente.saldoApertura);
    }
  });

  it("los días siguientes al corte son los saldos reales; Rosa no tiene", () => {
    for (const { cliente, nombre, demo } of casos) {
      const futuro = saldoDiario(cliente).filter(p => p.futuro);
      if (demo) expect(futuro, nombre).toEqual([]);
      else expect(futuro.map(p => p.saldo), nombre).toEqual(saldosReales(cliente));
    }
  });
});

describe("porSemana", () => {
  it("cubre cada día una sola vez y ninguna semana pasa de 7 días", () => {
    for (const { cliente, nombre } of casos) {
      const semanas = porSemana(cliente);
      for (let i = 1; i < semanas.length; i++) expect(semanas[i].desde, nombre).toBe(sumarDias(semanas[i - 1].hasta, 1));
      expect(semanas.every(s => diasEntre(s.desde, s.hasta) <= 6 && s.entra >= 0 && s.sale >= 0), nombre).toBe(true);
      expect(semanas.filter(s => !s.futuro).at(-1)?.hasta, nombre).toBe(cliente.corte);
    }
  });

  it("lo que entra menos lo que sale explica el cambio del saldo, en la historia y en el futuro", () => {
    for (const { cliente, nombre } of casos) {
      const semanas = porSemana(cliente);
      const neto = (futuro: boolean) => sumar(semanas.filter(s => s.futuro === futuro).map(s => s.entra - s.sale));
      expect(neto(false), nombre).toBe(cliente.saldoCorte - cliente.saldoApertura);
      const reales = saldosReales(cliente);
      if (cliente.futuro.length > 0) expect(neto(true), nombre).toBe(reales[reales.length - 1] - cliente.saldoCorte);
    }
  });
});
