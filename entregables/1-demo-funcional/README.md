# 1 · Demo funcional

> Lámina: «Aplicación, prototipo o notebook interactivo que pueda ejecutarse o mostrarse de punta a punta».

## Dónde verla

| Forma | Cómo |
|---|---|
| **Publicada** | <https://copiloto-anticipador-hack.vercel.app> → «Entrar al prototipo» → «Ver el caso de Andrea». Vercel despliega la rama `main` automáticamente |
| **Estado de los servicios** | <https://copiloto-anticipador-hack.vercel.app/api/estado> responde solo `true`/`false` por pieza (IA, voz, avisos, lectura de documentos), nunca una clave |
| **En local** | Ver abajo. Funciona completa **sin claves**: el chat responde con textos del motor y la voz es la del propio navegador |

```bash
npm ci
cp .env.example .env.local   # opcional: claves de Anthropic y Fish Audio
npm run dev                  # http://localhost:3000
```

Requisitos: Node.js 24 (el mismo que usa la CI) y un navegador moderno. Variables de entorno
documentadas en [`.env.example`](../../.env.example) y [`docs/INFRAESTRUCTURA.md`](../../docs/INFRAESTRUCTURA.md).

## Qué se puede hacer de punta a punta

El caso de demostración es **Andrea**, una fisioterapeuta independiente **inventada** (ingresos que
cambian cada semana y tres deudas). La fecha está congelada al 13-nov-2026 para que las cifras no
cambien entre el ensayo y la presentación.

| Pestaña | Qué muestra | Dónde está el código |
|---|---|---|
| **Inicio** | Saldo proyectado a 30 días, el día del déficit con monto y causa, y «Ver qué cambia» con el antes/después de cada jugada | [`src/componentes/hoy.tsx`](../../src/componentes/hoy.tsx), [`src/motor/proyeccion.ts`](../../src/motor/proyeccion.ts), [`src/motor/jugadas.ts`](../../src/motor/jugadas.ts) |
| **Mi ruta** | Pasos ordenados según la situación de la persona (tapar el hueco, ordenar deudas, colchón, historial) | [`src/componentes/tu-ruta.tsx`](../../src/componentes/tu-ruta.tsx), [`src/ruta/ruta.ts`](../../src/ruta/ruta.ts) |
| **Asistente** | Conversación escrita o por voz con el agente de IA; puede anotar ingresos, gastos y deudas (con «Deshacer») | [`src/componentes/chat.tsx`](../../src/componentes/chat.tsx), [`src/agente/`](../../src/agente/) |
| **Mi dinero** | Cuentas, ingresos y gastos fijos editables | [`src/componentes/mi-dinero.tsx`](../../src/componentes/mi-dinero.tsx) |
| **Deudas** | Qué deuda pagar primero según su costo real (TCEA) y cuánto se ahorra frente a pagar solo el mínimo | [`src/componentes/deudas.tsx`](../../src/componentes/deudas.tsx), [`src/motor/deudas.ts`](../../src/motor/deudas.ts), [`src/motor/prioridad.ts`](../../src/motor/prioridad.ts) |
| **Datos de prueba** y **Evaluación** | El dataset sintético y las métricas, visibles dentro de la app | [`src/componentes/dataset.tsx`](../../src/componentes/dataset.tsx), [`src/componentes/evaluacion.tsx`](../../src/componentes/evaluacion.tsx) |

La persona también puede «Empezar con mis datos» con cifras propias aproximadas o inventadas; se
guardan solo en su navegador (IndexedDB), no en un servidor.

## Guion y capturas

- Guion paso a paso, qué hacer si algo falla y preguntas probables del jurado:
  [`docs/GUIA-FINAL.md`](../../docs/GUIA-FINAL.md) (sección «Guion de la demo»).
- Capturas en celular (390×844), tableta (1024×768) y escritorio (1440×900):
  [`docs/capturas/`](../../docs/capturas/). Se tomaron el 14-nov-2026; la portada se rediseñó después
  (PR #22), así que pueden no coincidir con la versión publicada.

## Plan B si falla algo en vivo

| Falla | Qué pasa |
|---|---|
| La API de Anthropic no responde o no hay clave | El chat responde con los textos del motor (mismas cifras, sin IA) |
| Fish Audio no responde | Se usa la voz del navegador |
| Sin internet | `npm run dev` en local con los datos de demostración |
