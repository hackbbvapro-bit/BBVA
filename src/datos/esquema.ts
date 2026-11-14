/** Migraciones de la base local, en orden. Nunca se edita una ya publicada: se agrega la siguiente. */
export interface Migracion {
  version: number;
  sql: string;
}

export const MIGRACIONES: Migracion[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE perfil (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('dependiente','independiente','mixto')),
        descripcion TEXT NOT NULL,
        ingreso_aprox INTEGER NOT NULL CHECK (ingreso_aprox >= 0),
        dias_cobro TEXT NOT NULL,
        hoy TEXT NOT NULL
      );
      CREATE TABLE cuentas (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        saldo INTEGER NOT NULL
      );
      CREATE TABLE fijos (
        id TEXT PRIMARY KEY,
        sentido TEXT NOT NULL CHECK (sentido IN ('ingreso','gasto')),
        descripcion TEXT NOT NULL,
        monto INTEGER NOT NULL CHECK (monto > 0),
        dia INTEGER NOT NULL CHECK (dia BETWEEN 1 AND 31),
        categoria TEXT NOT NULL
      );
      CREATE TABLE movimientos (
        id TEXT PRIMARY KEY,
        fecha TEXT NOT NULL,
        monto INTEGER NOT NULL,
        descripcion TEXT NOT NULL,
        categoria TEXT NOT NULL,
        canal TEXT NOT NULL
      );
      CREATE TABLE deudas (
        id TEXT PRIMARY KEY,
        entidad TEXT NOT NULL,
        nombre TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK (tipo IN ('tarjeta','prestamo','personal')),
        saldo INTEGER NOT NULL CHECK (saldo >= 0),
        tcea_bp INTEGER CHECK (tcea_bp >= 0),
        pago_minimo INTEGER NOT NULL CHECK (pago_minimo >= 0),
        pago_habitual INTEGER NOT NULL CHECK (pago_habitual >= 0),
        dia_pago INTEGER NOT NULL CHECK (dia_pago BETWEEN 1 AND 31),
        dias_atraso INTEGER NOT NULL CHECK (dias_atraso >= 0),
        pagada BOOLEAN NOT NULL
      );
      CREATE TABLE cobros (
        id TEXT PRIMARY KEY,
        quien TEXT NOT NULL,
        monto INTEGER NOT NULL CHECK (monto > 0),
        fecha_prometida TEXT NOT NULL,
        nota TEXT NOT NULL,
        cobrado BOOLEAN NOT NULL
      );
      CREATE TABLE documentos (
        id TEXT PRIMARY KEY,
        tipo TEXT NOT NULL,
        resumen TEXT NOT NULL,
        datos TEXT NOT NULL,
        fecha TEXT NOT NULL
      );
      CREATE TABLE avisos_leidos (
        clave TEXT PRIMARY KEY
      );
    `,
  },
];

export const VERSION_ACTUAL = MIGRACIONES[MIGRACIONES.length - 1].version;

/** Lo mínimo que necesita el migrador; lo cumplen PGlite y las transacciones de PGlite. */
export interface Ejecutor {
  exec(sql: string): Promise<unknown>;
  query<T = Record<string, unknown>>(sql: string, parametros?: unknown[]): Promise<{ rows: T[] }>;
}

/** Aplica las migraciones pendientes, cada una en su transacción. Devuelve las versiones aplicadas. */
export async function migrar(
  db: Ejecutor & { transaction<T>(f: (tx: Ejecutor) => Promise<T>): Promise<T> },
): Promise<number[]> {
  await db.exec("CREATE TABLE IF NOT EXISTS migraciones (version INTEGER PRIMARY KEY, aplicada TEXT NOT NULL)");
  const hechas = new Set(
    (await db.query<{ version: number }>("SELECT version FROM migraciones")).rows.map(f => f.version),
  );
  const aplicadas: number[] = [];
  for (const m of MIGRACIONES.filter(x => !hechas.has(x.version))) {
    await db.transaction(async tx => {
      await tx.exec(m.sql);
      await tx.query("INSERT INTO migraciones (version, aplicada) VALUES ($1, $2)", [m.version, new Date().toISOString()]);
    });
    aplicadas.push(m.version);
  }
  return aplicadas;
}
