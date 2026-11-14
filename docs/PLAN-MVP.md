# Plan del MVP (borrador para discutir con el equipo)

## Alcance: lo que SÍ entra (orden de prioridad)
1. **Datos sintéticos realistas**: 3 perfiles peruanos (dependiente con sueldo fijo, independiente
   con ingresos irregulares, mixto con Yape/Plin), 90 días de movimientos cada uno.
2. **Detector de recurrentes**: ingresos, alquiler, servicios, suscripciones, cuotas de deuda.
3. **Proyección de saldo a 30 días** (determinista) con el día de déficit marcado.
4. **Aviso con causa**: qué gastos coinciden ese día y cuánto falta.
5. **2-3 jugadas con costo**: mover un pago, pagar el mínimo (costo en intereses), recortar un gasto.
6. **Orden de deudas por TCEA** (avalancha) y ahorro frente a pagar en otro orden.
7. **Explicación en lenguaje llano** generada por IA a partir de los números ya calculados.
8. **Agente con voz** (decidido el 13-nov): se le pregunta hablando o escribiendo y contesta con voz.
   Solo usa las herramientas del motor; no calcula ni inventa cifras.
9. **Avisos**: campanita dentro de la app y notificación al celular (PWA instalada).

Las ideas y por qué esta primero: `docs/IDEAS.md`.

## Lo que NO entra (aunque tiente)
- Conexión real con bancos (no hay finanzas abiertas operativas en Perú todavía).
- Mover dinero, pagar o contratar productos.
- Inversiones, criptomonedas, recomendaciones de productos concretos.
- Chat libre de propósito general: el agente conversa, pero solo sobre lo que calculó el motor
  (si le preguntan otra cosa, lo dice y vuelve al tema).
- Base de datos y cuentas de usuario: no hacen falta para la demo (ver `docs/INFRAESTRUCTURA.md`).

## Reparto sugerido (5 personas, ajustar)
| Rol | Tarea |
|---|---|
| Datos | Generador de movimientos sintéticos y los 3 perfiles |
| Motor | Recurrentes, proyección, TCEA y jugadas, con tests |
| Interfaz | Pantalla de saldo proyectado, aviso y jugadas (móvil primero) |
| IA | Capa de explicación (prompt + guardas: solo usa números del motor) |
| Pitch | Problema con cifras, guion de la demo de 3 min, preguntas del jurado |

## Infraestructura mínima
- GitHub (este repo) + Vercel para la demo. Base de datos solo si hace falta (los datos sintéticos
  pueden ir en archivos).
- Clave de IA únicamente en las variables de entorno del hosting.
- Ojo: con Vercel Hobby y repo privado, los despliegues de commits de otros autores pueden quedar
  bloqueados; el dueño del proyecto en Vercel debe ser quien integre, o usar repo público / plan Pro.

## Guion de la demo (3 minutos)
1. **El problema** (30 s): solo 39 % de los peruanos podría afrontar un gasto imprevisto de un mes
   de ingresos (SBS-CAF, 2026); las apps te dicen en qué gastaste, no lo que viene. Las frases
   con fuente están en `investigacion/10-verificacion-de-cifras.md`.
2. **La persona** (20 s): independiente con ingresos irregulares, dos tarjetas, Yape diario.
3. **El aviso** (60 s): «el lunes 23 te faltarán S/ 200.00» (perfil Rosa) → por qué → 3 jugadas
   con su costo. El guion detallado, con las cifras que hoy muestra la app, está en
   `docs/GUIA-FINAL.md`.
4. **La deuda** (40 s): qué tarjeta pagar primero y cuánto ahorra.
5. **Confianza** (30 s): todos los números salen de un motor con tests; la IA solo explica.

## Preguntas pendientes para los organizadores
- ~~¿Se puede llegar con código previo?~~ Sí (confirmado 13-nov).
- ¿Hay datos sintéticos oficiales o API de BBVA para usar?
- ¿Hay restricción de stack o de proveedor de IA?
- ¿Cómo se presenta (tiempo, formato, entregables)?
