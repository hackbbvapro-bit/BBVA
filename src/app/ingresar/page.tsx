import type { Metadata } from "next";
import { Marca } from "@/componentes/ui";

export const metadata: Metadata = { title: "Ingresar · Copiloto" };

export default function Ingresar() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-papel px-4 py-10 text-tinta [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-4 [&_:focus-visible]:outline-electrico">
      <div className="w-full max-w-md">
        <Marca />
        <section className="mt-8 rounded-[22px] border border-linea bg-white p-6 md:p-8">
          <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.025em] text-noche md:text-[2rem]">
            Copiloto financiero
          </h1>
          <p className="mt-2 text-lg leading-relaxed text-gris">Prototipo de hackathon con datos sintéticos. No es un producto oficial de ningún banco.</p>
          <p className="mt-6 leading-relaxed text-tinta">
            Te avisa antes de que te falte dinero y te dice qué pagar primero. Para probarlo entras con un caso de
            ejemplo: Andrea, una fisioterapeuta inventada que trabaja por su cuenta y cobra por sesión.
          </p>
          <form method="post" action="/api/ingresar" className="mt-8">
            <button
              type="submit"
              className="min-h-12 w-full cursor-pointer rounded-2xl bg-electrico px-4 py-3 text-[17px] font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-marino active:scale-[.97]"
            >
              Entrar al prototipo
            </button>
          </form>
        </section>
        <p className="mt-5 px-1 text-sm leading-relaxed text-gris">
          Simulación educativa: no es asesoría financiera ni opera con dinero real. No se piden ni se guardan claves, y
          no hace falta ningún dato personal real.
        </p>
      </div>
    </main>
  );
}
