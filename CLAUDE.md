# Hack BBVA 2026 — reglas del proyecto

Proyecto de equipo para la **final presencial** de la Hackathon BBVA 2026 (14 y 15 de noviembre).
No confundir con `~/Proyectos/Hackathon-BBVA-2026/`, que es la prueba técnica individual de octubre
y tiene sus propias reglas.

## Lo primero
- Lee `README.md`, `docs/PLAN-MVP.md` y, según la tarea, `investigacion/` y `conocimiento/`.
- El producto es un **copiloto anticipador**: proyecta el saldo a 30 días, avisa del déficit con
  fecha y causa y propone 2-3 jugadas con su costo en soles.

## Reglas duras
1. **Cero datos personales.** Ni del dueño del repo ni de nadie. Solo datos sintéticos inventados.
   Este repositorio lo verán compañeros de equipo y, posiblemente, el jurado.
2. **Los números los calcula el código; la IA solo explica.** Ningún monto, tasa ni fecha en
   pantalla puede salir de un modelo de lenguaje. Cada cálculo de dinero tiene test.
3. **Dinero en céntimos enteros** (o `Decimal`), nunca `float` para sumar montos.
4. **Fechas sin deriva:** sumar meses desde la fecha ancla original, no encadenando. Días 29-31
   en meses cortos van al último día del mes. Hay tests para 31-ene, 29-feb y 31-dic.
5. **Sin secretos en el repo.** Las claves de IA van en variables de entorno (`.env` en
   `.gitignore`, en el hosting en sus variables). Nunca se imprimen ni se pegan en el chat.
6. **Nunca inventar** una cifra de mercado: se cita la fuente o se marca `[SIN VERIFICAR]`.
7. Nada de push forzado, `reset --hard` ni `git clean` sin permiso expreso.

## Cómo trabajar
- Ramas cortas por tarea y pull request a `main`; commits pequeños y explicativos.
- Antes de dar algo por terminado: ejecutar los tests y verlo funcionar.
- Lenguaje llano en español; analogía corta antes del detalle técnico cuando ayude.
- Orden de la respuesta: conclusión → impacto en la demo → evidencia → decisión pendiente.
