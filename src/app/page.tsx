import { Copiloto } from "@/componentes/copiloto";

// Temporal (fase de dirección): ?dir=b muestra la dirección B para compararla con la A.
export default async function Page({ searchParams }: { searchParams: Promise<{ dir?: string }> }) {
  const { dir } = await searchParams;
  return <Copiloto direccion={dir === "b" ? "b" : "a"} />;
}
