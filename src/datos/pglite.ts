import type { PGlite } from "@electric-sql/pglite";
import type { Movimiento } from "../motor/tipos";
import { migrar, type Ejecutor } from "./esquema";
import { validado, type Repositorio } from "./repositorio";
import { datosDeRosa } from "./semilla";
import type { Cobro, Datos, DeudaGuardada, DocumentoAnalizado, Fijo, Sentido } from "./tipos";
import type { TipoPerfil, Categoria, Canal } from "../motor/tipos";

type Tx = Ejecutor;

const TABLAS = ["avisos_leidos", "documentos", "cobros", "deudas", "movimientos", "fijos", "cuentas", "perfil"];

async function insertarMovimientos(tx: Tx, movimientos: Movimiento[]): Promise<void> {
  if (!movimientos.length) return;
  await tx.query(
    `INSERT INTO movimientos (id, fecha, monto, descripcion, categoria, canal)
     SELECT * FROM unnest($1::text[], $2::text[], $3::int[], $4::text[], $5::text[], $6::text[])`,
    [
      movimientos.map(m => m.id), movimientos.map(m => m.fecha), movimientos.map(m => m.monto),
      movimientos.map(m => m.descripcion), movimientos.map(m => m.categoria), movimientos.map(m => m.canal),
    ],
  );
}

const upsertFijo = (tx: Tx, sentido: Sentido, f: Fijo) =>
  tx.query(
    `INSERT INTO fijos (id, sentido, descripcion, monto, dia, categoria) VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (id) DO UPDATE SET sentido=$2, descripcion=$3, monto=$4, dia=$5, categoria=$6`,
    [f.id, sentido, f.descripcion, f.monto, f.dia, f.categoria],
  );
const upsertDeuda = (tx: Tx, d: DeudaGuardada) =>
  tx.query(
    `INSERT INTO deudas (id, entidad, nombre, tipo, saldo, tcea_bp, pago_minimo, pago_habitual, dia_pago, dias_atraso, pagada)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (id) DO UPDATE SET entidad=$2, nombre=$3, tipo=$4, saldo=$5, tcea_bp=$6, pago_minimo=$7,
       pago_habitual=$8, dia_pago=$9, dias_atraso=$10, pagada=$11`,
    [d.id, d.entidad, d.nombre, d.tipo, d.saldo, d.tceaBp, d.pagoMinimo, d.pagoHabitual, d.diaPago, d.diasAtraso, d.pagada],
  );
const upsertCobro = (tx: Tx, c: Cobro) =>
  tx.query(
    `INSERT INTO cobros (id, quien, monto, fecha_prometida, nota, cobrado) VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (id) DO UPDATE SET quien=$2, monto=$3, fecha_prometida=$4, nota=$5, cobrado=$6`,
    [c.id, c.quien, c.monto, c.fechaPrometida, c.nota, c.cobrado],
  );
const upsertDocumento = (tx: Tx, d: DocumentoAnalizado) =>
  tx.query(
    `INSERT INTO documentos (id, tipo, resumen, datos, fecha) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (id) DO UPDATE SET tipo=$2, resumen=$3, datos=$4, fecha=$5`,
    [d.id, d.tipo, d.resumen, JSON.stringify(d.datos ?? null), d.fecha],
  );
const upsertPerfil = (tx: Tx, p: Datos["perfil"]) =>
  tx.query(
    `INSERT INTO perfil (id, nombre, tipo, descripcion, ingreso_aprox, dias_cobro, hoy) VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (id) DO UPDATE SET nombre=$2, tipo=$3, descripcion=$4, ingreso_aprox=$5, dias_cobro=$6, hoy=$7`,
    [p.id, p.nombre, p.tipo, p.descripcion, p.ingresoAprox, JSON.stringify(p.diasCobro), p.hoy],
  );
const upsertCuenta = (tx: Tx, c: Datos["cuentas"][number]) =>
  tx.query(
    `INSERT INTO cuentas (id, nombre, saldo) VALUES ($1,$2,$3) ON CONFLICT (id) DO UPDATE SET nombre=$2, saldo=$3`,
    [c.id, c.nombre, c.saldo],
  );

async function escribirTodo(tx: Tx, d: Datos): Promise<void> {
  await upsertPerfil(tx, d.perfil);
  for (const c of d.cuentas) await upsertCuenta(tx, c);
  for (const f of d.ingresosFijos) await upsertFijo(tx, "ingreso", f);
  for (const f of d.gastosFijos) await upsertFijo(tx, "gasto", f);
  await insertarMovimientos(tx, d.movimientos);
  for (const x of d.deudas) await upsertDeuda(tx, x);
  for (const c of d.cobros) await upsertCobro(tx, c);
  for (const doc of d.documentos) await upsertDocumento(tx, doc);
  for (const clave of d.avisosLeidos) await tx.query("INSERT INTO avisos_leidos (clave) VALUES ($1) ON CONFLICT DO NOTHING", [clave]);
}

async function leer(db: Tx): Promise<Datos> {
  const q = async <T>(sql: string) => (await db.query<T>(sql)).rows;
  const [perfil] = await q<{ id: string; nombre: string; tipo: TipoPerfil; descripcion: string; ingreso_aprox: number; dias_cobro: string; hoy: string }>(
    "SELECT * FROM perfil LIMIT 1",
  );
  if (!perfil) throw new Error("La base no tiene perfil");
  const fijos = await q<{ id: string; sentido: Sentido; descripcion: string; monto: number; dia: number; categoria: Categoria }>(
    "SELECT * FROM fijos ORDER BY dia, descripcion, id",
  );
  const aFijo = ({ id, descripcion, monto, dia, categoria }: (typeof fijos)[number]): Fijo => ({ id, descripcion, monto, dia, categoria });
  return {
    perfil: {
      id: perfil.id, nombre: perfil.nombre, tipo: perfil.tipo, descripcion: perfil.descripcion,
      ingresoAprox: perfil.ingreso_aprox, diasCobro: JSON.parse(perfil.dias_cobro) as number[], hoy: perfil.hoy,
    },
    cuentas: await q<Datos["cuentas"][number]>("SELECT id, nombre, saldo FROM cuentas ORDER BY (id = 'cuenta-principal') DESC, nombre, id"),
    ingresosFijos: fijos.filter(f => f.sentido === "ingreso").map(aFijo),
    gastosFijos: fijos.filter(f => f.sentido === "gasto").map(aFijo),
    movimientos: await q<Movimiento & { canal: Canal }>("SELECT id, fecha, monto, descripcion, categoria, canal FROM movimientos ORDER BY fecha, id"),
    deudas: (
      await q<{
        id: string; entidad: string; nombre: string; tipo: DeudaGuardada["tipo"]; saldo: number; tcea_bp: number | null;
        pago_minimo: number; pago_habitual: number; dia_pago: number; dias_atraso: number; pagada: boolean;
      }>("SELECT * FROM deudas ORDER BY nombre, id")
    ).map(d => ({
      id: d.id, entidad: d.entidad, nombre: d.nombre, tipo: d.tipo, saldo: d.saldo, tceaBp: d.tcea_bp,
      pagoMinimo: d.pago_minimo, pagoHabitual: d.pago_habitual, diaPago: d.dia_pago, diasAtraso: d.dias_atraso, pagada: d.pagada,
    })),
    cobros: (
      await q<{ id: string; quien: string; monto: number; fecha_prometida: string; nota: string; cobrado: boolean }>(
        "SELECT * FROM cobros ORDER BY fecha_prometida, id",
      )
    ).map(c => ({ id: c.id, quien: c.quien, monto: c.monto, fechaPrometida: c.fecha_prometida, nota: c.nota, cobrado: c.cobrado })),
    documentos: (await q<DocumentoAnalizado & { datos: string }>("SELECT * FROM documentos ORDER BY fecha, id")).map(d => ({
      ...d, datos: JSON.parse(d.datos) as unknown,
    })),
    avisosLeidos: (await q<{ clave: string }>("SELECT clave FROM avisos_leidos ORDER BY clave")).map(a => a.clave),
  };
}

/** Repositorio sobre PGlite. Aplica las migraciones y, si la base está vacía, carga la semilla de Rosa. */
export async function crearRepositorioPGlite(db: PGlite): Promise<Repositorio> {
  await db.waitReady;
  await migrar(db);
  const hay = (await db.query<{ n: number }>("SELECT count(*)::int AS n FROM perfil")).rows[0].n;
  if (hay === 0) await db.transaction(tx => escribirTodo(tx, datosDeRosa()));
  const borrar = (tabla: string) => async (id: string) => void (await db.query(`DELETE FROM ${tabla} WHERE id = $1`, [id]));
  // Todo o nada: si una fila falla, la base queda como estaba.
  const reemplazarTodo = (datos: Datos) =>
    db.transaction(async tx => {
      for (const t of TABLAS) await tx.exec(`DELETE FROM ${t}`);
      await escribirTodo(tx, datos);
    });
  return validado({
    leerTodo: () => leer(db),
    guardarPerfil: async p => void (await upsertPerfil(db, p)),
    guardarCuenta: async c => void (await upsertCuenta(db, c)),
    borrarCuenta: borrar("cuentas"),
    guardarFijo: async (sentido, f) => void (await upsertFijo(db, sentido, f)),
    borrarFijo: borrar("fijos"),
    guardarDeuda: async d => void (await upsertDeuda(db, d)),
    borrarDeuda: borrar("deudas"),
    guardarCobro: async c => void (await upsertCobro(db, c)),
    borrarCobro: borrar("cobros"),
    guardarDocumento: async d => void (await upsertDocumento(db, d)),
    marcarAvisoLeido: async clave => void (await db.query("INSERT INTO avisos_leidos (clave) VALUES ($1) ON CONFLICT DO NOTHING", [clave])),
    cargar: datos => reemplazarTodo(datos),
    restablecer: () => reemplazarTodo(datosDeRosa()),
  });
}
