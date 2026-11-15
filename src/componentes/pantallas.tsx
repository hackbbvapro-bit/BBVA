"use client";
/**
 * Pantallas que no son la de inicio: se bajan aparte para que «Inicio» aparezca antes.
 * Como un restaurante que sirve la entrada mientras termina de preparar el resto: apenas el
 * navegador queda libre, `precargarPantallas` las baja todas en segundo plano, así cambiar de
 * pestaña sigue siendo instantáneo (y quedan guardadas para funcionar sin red).
 */
import dynamic from "next/dynamic";

const cargarRuta = () => import("@/componentes/tu-ruta");
const cargarDeudas = () => import("@/componentes/deudas");
const cargarDinero = () => import("@/componentes/mi-dinero");
const cargarChat = () => import("@/componentes/chat");
const cargarPerfil = () => import("@/componentes/perfil");
const cargarComo = () => import("@/componentes/como-funciona");
const cargarDataset = () => import("@/componentes/dataset");
const cargarEvaluacion = () => import("@/componentes/evaluacion");

/** Mientras baja la pantalla (solo si se abre antes de la precarga): bloques suaves, sin texto que salte. */
function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando" className="flex flex-col gap-4 pt-2">
      <div className="h-7 w-2/5 animate-pulse rounded-lg bg-black/5 motion-reduce:animate-none" />
      <div className="h-32 animate-pulse rounded-2xl bg-black/5 motion-reduce:animate-none" />
      <div className="h-20 animate-pulse rounded-2xl bg-black/5 motion-reduce:animate-none" />
    </div>
  );
}

const opciones = { loading: Cargando };

export const MiRuta = dynamic(() => cargarRuta().then(m => m.MiRuta), opciones);
export const Deudas = dynamic(() => cargarDeudas().then(m => m.Deudas), opciones);
export const MiDinero = dynamic(() => cargarDinero().then(m => m.MiDinero), opciones);
export const Chat = dynamic(() => cargarChat().then(m => m.Chat), opciones);
export const VistaPerfil = dynamic(() => cargarPerfil().then(m => m.Perfil), opciones);
export const ComoFunciona = dynamic(() => cargarComo().then(m => m.ComoFunciona), opciones);
export const Dataset = dynamic(() => cargarDataset().then(m => m.Dataset), opciones);
export const Evaluacion = dynamic(() => cargarEvaluacion().then(m => m.Evaluacion), opciones);

/** Las más usadas primero; las de consulta (datos de prueba, evaluación) al final. */
const ORDEN = [cargarChat, cargarRuta, cargarDeudas, cargarDinero, cargarPerfil, cargarComo, cargarDataset, cargarEvaluacion];

/** Baja todas las pantallas cuando el navegador queda libre. Devuelve cómo cancelar lo que falte. */
export function precargarPantallas(): () => void {
  let cancelado = false;
  const libre = (hacer: () => void) => {
    // Safari no tiene requestIdleCallback: ahí basta una pausa corta.
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(hacer, { timeout: 2000 });
    else setTimeout(hacer, 300);
  };
  const siguiente = (i: number) => {
    if (cancelado || i >= ORDEN.length) return;
    libre(() => {
      if (cancelado) return;
      // Si una falla (sin red), se baja al abrirla; no se reintenta aquí.
      ORDEN[i]().catch(() => {}).finally(() => siguiente(i + 1));
    });
  };
  siguiente(0);
  return () => { cancelado = true; };
}
