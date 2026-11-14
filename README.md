# Hack BBVA 2026 — Copiloto anticipador

Final presencial de la Hackathon BBVA 2026 · Torre Central BBVA, San Isidro (Lima)
- Sábado 14-nov-2026, 08:30-19:30
- Domingo 15-nov-2026, 08:30-13:30

## El reto (resumen)
Construir con IA algo que ayude a una persona a **comprender, anticipar y mejorar** su situación
financiera, usando **datos sintéticos**, y presentar un **MVP** funcionando.

> Confirmado (13-nov-2026): se permite llegar a la final con código previo.
> Por ahora el repositorio lo trabaja una sola persona; el resto del equipo se suma más adelante.

## La idea en una línea
**Un copiloto que te avisa ANTES de que te falte la plata, te dice por qué y te da 2-3 jugadas
con su costo en soles.**

Responde a dos preguntas que hoy ninguna app peruana contesta bien:
1. **«¿Llego a fin de mes?»** → proyecta el saldo de los próximos 30 días y marca el día del déficit.
2. **«¿Qué deuda pago primero?»** → ordena las deudas por costo real (TCEA) y muestra cuánto se ahorra.

## Cómo funciona (versión MVP)
1. **Lee movimientos** sintéticos (CSV / JSON con el formato de un estado de cuenta, Yape/Plin incluidos).
2. **Detecta recurrentes**: sueldo o ingresos irregulares, alquiler, servicios, suscripciones, cuotas.
3. **Proyecta el saldo a 30 días** de forma determinista (sin IA).
4. **Avisa del déficit** con fecha y causa: «el 23 te faltan S/ 180 porque coinciden la cuota y el alquiler».
5. **Propone 2-3 jugadas** con su costo calculado: mover un pago, pagar solo el mínimo (y cuánto cuesta),
   recortar una suscripción, adelantar un cobro.
6. **La IA solo explica** en lenguaje llano lo que el motor ya calculó. Nunca inventa un número.

## Regla de oro
**Los números los calcula el programa; la IA solo los explica.** Todo monto que aparezca en
pantalla debe salir de una función con test.

## Diferencial peruano
- **Ingresos irregulares** (≈70 % de informalidad laboral): la proyección trabaja con rangos, no con un sueldo fijo.
- **Yape / Plin** como movimientos de primera clase, no como «otros».
- **TCEA** (costo real del crédito) para comparar deudas, no solo la tasa de interés.

## Qué hay en este repositorio
| Carpeta | Contenido |
|---|---|
| `investigacion/01-problemas-financieros-peru.md` | Qué le duele al peruano con su plata (SBS, Ipsos, Indecopi, INEI) |
| `investigacion/02-que-hace-bbva-y-que-no.md` | Qué ya tiene la app de BBVA Perú y dónde están los huecos |
| `investigacion/03-benchmark-asesores-ia-top.md` | Qué hacen los mejores asesores con IA del mundo (Cleo, Monarch, Rocket Money, Plum…) |
| `conocimiento/metodo-asesor.md` | Método de un asesor financiero: gastos, prioridades, deuda, escáner de estados de cuenta, errores a evitar |
| `docs/PLAN-MVP.md` | Alcance del MVP, reparto del equipo y guion de la demo |
| `CLAUDE.md` | Reglas para trabajar con Claude Code en este proyecto |

## Estado
- [x] Investigación y método
- [x] Confirmar si se permite código previo (sí)
- [ ] Confirmar stack, datos y formato de presentación
- [ ] Datos sintéticos
- [ ] Motor de proyección + tests
- [ ] Interfaz y explicación con IA
- [ ] Demo y pitch
