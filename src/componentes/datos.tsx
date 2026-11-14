"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { abrirAlmacen } from "@/datos/abrir";
import { aPerfil } from "@/datos/aPerfil";
import { prepararSinConexion } from "@/cliente/sinConexion";
import type { Repositorio } from "@/datos/repositorio";
import { ID_PROPIO, hoyEnLima } from "@/datos/semilla";
import type { Datos } from "@/datos/tipos";
import type { Perfil } from "@/motor";

type Estado =
  | { fase: "cargando" }
  | { fase: "error" }
  | { fase: "lista"; repo: Repositorio; datos: Datos; persistente: boolean; aviso?: string };

export interface ValorDatos {
  datos: Datos;
  /** Lo guardado convertido a la entrada del motor. */
  perfil: Perfil;
  persistente: boolean;
  aviso?: string;
  /** Ejecuta un cambio en la base y vuelve a leer todo: la pantalla se recalcula al instante. Lanza ErrorDatos si algo no es válido. */
  cambiar: (accion: (repo: Repositorio) => Promise<void>) => Promise<void>;
}

const Contexto = createContext<ValorDatos | null>(null);

export function useDatos(): ValorDatos {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useDatos va dentro de <ProveedorDatos>");
  return valor;
}

/** Contenido mientras se leen los datos guardados en el navegador. */
function Pantalla({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-papel px-4 text-tinta">
      <div className="w-full max-w-sm rounded-[22px] border border-linea bg-white p-6 text-center">{children}</div>
    </div>
  );
}

/** Para tests de renderizado: entrega unos datos fijos sin abrir la base. */
export function DatosDePrueba({ datos, children }: { datos: Datos; children: ReactNode }) {
  const valor: ValorDatos = { datos, perfil: aPerfil(datos), persistente: false, cambiar: async () => undefined };
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function ProveedorDatos({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ fase: "cargando" });

  useEffect(() => {
    let vivo = true;
    abrirAlmacen()
      .then(async a => {
        const datos = await a.repo.leerTodo();
        if (!vivo) return;
        setEstado({ fase: "lista", repo: a.repo, datos, persistente: a.persistente, aviso: a.aviso });
        prepararSinConexion();
      })
      .catch(() => vivo && setEstado({ fase: "error" }));
    return () => {
      vivo = false;
    };
  }, []);

  const repo = estado.fase === "lista" ? estado.repo : null;
  const cambiar = useCallback(
    async (accion: (repo: Repositorio) => Promise<void>) => {
      if (!repo) throw new Error("La base aún no está lista");
      await accion(repo);
      const datos = await repo.leerTodo();
      setEstado(previo => (previo.fase === "lista" ? { ...previo, datos } : previo));
    },
    [repo],
  );

  const valor = useMemo<ValorDatos | null>(() => {
    if (estado.fase !== "lista") return null;
    // Con datos propios, «hoy» es el día real en Lima (la demo conserva su fecha fija para que las cifras no cambien).
    const datos =
      estado.datos.perfil.id === ID_PROPIO ? { ...estado.datos, perfil: { ...estado.datos.perfil, hoy: hoyEnLima() } } : estado.datos;
    return { datos, perfil: aPerfil(datos), persistente: estado.persistente, aviso: estado.aviso, cambiar };
  }, [estado, cambiar]);

  if (estado.fase === "error") {
    return (
      <Pantalla>
        <h1 className="text-lg font-semibold text-noche">No pudimos abrir tus datos</h1>
        <p className="mt-2 text-gris">Es un problema de este navegador, no de tu dinero. Recarga la página para intentarlo otra vez.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 min-h-11 rounded-full bg-electrico px-6 font-semibold text-white"
        >
          Recargar
        </button>
      </Pantalla>
    );
  }
  if (!valor) {
    return (
      <Pantalla>
        <p role="status" className="text-lg font-semibold text-noche">Preparando tus datos…</p>
        <p className="mt-2 text-gris">Tus datos se quedan en este equipo.</p>
      </Pantalla>
    );
  }
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
