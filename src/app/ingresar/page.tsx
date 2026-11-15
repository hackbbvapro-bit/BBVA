import type { Metadata } from "next";
import { Portada } from "@/componentes/portada";

export const metadata: Metadata = {
  title: "Finance Pro · Tu copiloto financiero con IA",
  description:
    "Prototipo educativo con datos sintéticos: proyecta tu saldo a 30 días, ordena tus deudas y te propone cómo evitar quedarte sin dinero. Proyecto independiente para hackathon.",
};

/** Portada sin sesión: cada botón abre la sesión de prueba y entra directo a la opción elegida. */
export default function Ingresar() {
  return <Portada acciones={{ tipo: "formulario", accion: "/api/ingresar" }} />;
}
