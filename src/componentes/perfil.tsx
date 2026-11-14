"use client";
import type { Perfil as PerfilMotor } from "@/motor";
import { Portada, tarjeta } from "@/componentes/ui";

/** Perfil de la cuenta demo. Solo muestra lo que la app usa; no se piden ni se guardan DNI, claves ni dirección. */
export function Perfil({ perfil }: { perfil: PerfilMotor }) {
  return (
    <>
      <Portada>
        <p className="text-[15px] text-gris">Perfil</p>
        <h1 className="mt-1 text-[1.75rem] font-semibold leading-tight tracking-[-0.025em] text-noche md:text-[2rem]">
          {perfil.nombre}
        </h1>
        <p className="mt-2 leading-relaxed text-gris">Cuenta demo · datos inventados para la hackathon.</p>
      </Portada>
      <section className={`${tarjeta} aparecer`}>
        <h2 className="text-lg font-semibold text-noche">Cómo te conoce el copiloto</h2>
        <p className="mt-3 leading-relaxed text-tinta">{perfil.descripcion}</p>
        <p className="mt-4 text-sm leading-relaxed text-gris">
          Es un prototipo: en la versión real entrarías con el inicio de sesión de tu app BBVA. Aquí no se piden ni se
          guardan claves, DNI ni tarjetas.
        </p>
      </section>
    </>
  );
}
