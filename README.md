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
4. **Avisa del déficit** con fecha y causa: «el lunes 23 te faltarán S/ 119.07 porque se juntan el alquiler y el pago de la tarjeta».
5. **Propone 2-3 jugadas** con su costo calculado: pausar suscripciones, pagar solo el mínimo (y cuánto cuesta),
   recortar una suscripción, adelantar un cobro.
6. **La IA solo explica** en lenguaje llano lo que el motor ya calculó. Nunca inventa un número.

## Regla de oro
**Los números los calcula el programa; la IA solo los explica.** Todo monto que aparezca en
pantalla debe salir de una función con test.

## Diferencial peruano
- **Ingresos irregulares** (cerca de 70 % de informalidad laboral según el INEI): la proyección trabaja con rangos, no con un sueldo fijo.
- **Yape / Plin** como movimientos de primera clase, no como «otros».
- **TCEA** (costo real del crédito) para comparar deudas, no solo la tasa de interés.

## Qué hay en este repositorio
| Carpeta | Contenido |
|---|---|
| **`entregables/`** | **Índice de los 5 entregables pedidos por la organización** (demo, dataset, modelo/IA, evidencia, arquitectura), cada uno con su resumen y enlaces |
| `investigacion/01-problemas-financieros-peru.md` | Qué le duele al peruano con su plata (SBS, Ipsos, Indecopi, INEI) |
| `investigacion/02-que-hace-bbva-y-que-no.md` | Qué ya tiene la app de BBVA Perú y dónde están los huecos |
| `investigacion/03-benchmark-asesores-ia-top.md` | Qué hacen los mejores asesores con IA del mundo (Cleo, Monarch, Rocket Money, Plum…) |
| `conocimiento/metodo-asesor.md` | Método de un asesor financiero: gastos, prioridades, deuda, escáner de estados de cuenta, errores a evitar |
| `investigacion/04` a `09` | Deuda y tarjetas, acceso al crédito, BBVA a fondo, cómo se gana una hackathon, voz del usuario y competencia |
| `investigacion/10-verificacion-de-cifras.md` | **Fuente de verdad de las cifras de mercado.** Qué está verificado, qué se corrigió y qué no se dice. Si otro documento la contradice, vale este |
| `conocimiento/asesorfi/` | Conocimiento incorporado de AsesorFi |
| `docs/PLAN-MVP.md` | Alcance del MVP, reparto del equipo y guion de la demo |
| `docs/IDEAS.md` | Las ideas planteadas para la final |
| `docs/INFRAESTRUCTURA.md` | Qué está montado, qué no y por qué; variables de entorno y plan B |
| `docs/GUIA-FINAL.md` | Paso a paso para la final: claves, publicar, probar en el celular, guion de la demo y qué hacer si algo falla |
| `src/motor/`, `src/datos/`, `src/explica/` | El motor que calcula (con tests), los tres perfiles sintéticos y los textos sin IA |
| `src/componentes/`, `src/app/`, `src/cliente/` | La app para celular: Hoy, Deudas, Hablar y avisos |
| `src/agente/`, `src/servidor/`, `src/app/api/` | El agente de IA, la voz, los avisos y sus protecciones |
| `CLAUDE.md` | Reglas para trabajar con Claude Code en este proyecto |

## Cómo probarlo en tu computadora
```bash
npm install
cp .env.example .env.local   # las claves son opcionales: sin ellas la app usa sus respaldos
npm run dev                  # abre http://localhost:3000
```
Antes de dar algo por bueno: `npm run typecheck`, `npm run lint`, `npm test` y `npm run build`.
El formato del código lo pone Prettier (`npx prettier --write <archivo>`).

El caso se guarda en IndexedDB, el almacenamiento nativo del navegador. El inicio ya no descarga ni
arranca PostgreSQL. Si el navegador tenía un caso en PGlite, se recupera una sola vez al abrir la
nueva versión; la base anterior se conserva. Se mantiene la protección de una sola pestaña con
escritura y el respaldo temporal en memoria si el navegador no permite guardar.

Sin claves, la app funciona completa con datos de demostración: el chat responde con textos del
motor y la voz es la del propio celular. Con `ANTHROPIC_API_KEY` conversa el agente de IA y con
`FISH_API_KEY` + `FISH_VOICE_ID` habla con voz de Fish Audio. Detalle en `docs/INFRAESTRUCTURA.md`.

## Estado
- [x] Investigación y método
- [x] Confirmar si se permite código previo (sí)
- [x] Stack: Next.js + TypeScript + Tailwind + Vitest
- [x] Datos sintéticos (Andrea, fisioterapeuta independiente inventada; Carlos y Lucía solo en pruebas)
- [x] Motor de proyección + tests
- [x] Interfaz para celular, chat con respaldo sin IA y avisos dentro de la app
- [x] Cifras del pitch revisadas contra su fuente (`investigacion/10-verificacion-de-cifras.md`)
- [x] App publicada en `https://copiloto-anticipador-hack.vercel.app` desde el repositorio del equipo `hackbbvapro-bit/BBVA`; Vercel despliega `main` automáticamente
- [x] Claves de Anthropic, Fish Audio y avisos cargadas en Vercel (`/api/estado` responde `ia`, `voz` y `push` en `true` [MEDIDO 15-nov])
- [x] Agente con IA real: 0 de 36 respuestas con cifras ajenas al motor y 12 de 12 preguntas tramposas bien resueltas (`docs/EVALUACION.md` §14)
- [x] Voz de Fish Audio en producción (`docs/GUIA-FINAL.md`). La transcripción con Fish no se probó
- [x] Evaluación del motor con 1 000 clientes sintéticos (`docs/EVALUACION.md`) y CI en cada pull request
- [x] Entregables ordenados en `entregables/`
- [ ] Confirmar el tope de gasto en Anthropic y Fish Audio [SIN VERIFICAR]
- [ ] Probar micrófono y notificaciones en un celular real (en iPhone, con la app instalada)
- [ ] Pitch (guion de la demo en `docs/GUIA-FINAL.md`)
