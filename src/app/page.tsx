import { Copiloto } from "@/componentes/copiloto";

// Temporal (DIRECCION): ?dir=b muestra la segunda dirección para el checkpoint. Se borra al elegir.
export default async function Page({ searchParams }: { searchParams: Promise<{ dir?: string }> }) {
  const { dir } = await searchParams;
  return <Copiloto direccion={dir === "b" ? "b" : "a"} />;
}
