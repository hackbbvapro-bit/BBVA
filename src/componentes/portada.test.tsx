/** Portada: textos exactos del kit, un solo título principal, botones que llevan a cada flujo y avisos sin promesas. */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Portada } from "./portada";

const conFormulario = () => renderToStaticMarkup(<Portada acciones={{ tipo: "formulario", accion: "/api/ingresar" }} />);
const conBotones = (error?: string) =>
  renderToStaticMarkup(<Portada acciones={{ tipo: "botones", alEmpezar: () => {}, alVerEjemplo: () => {}, error }} />);
const texto = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("Portada", () => {
  it("tiene un único h1 con el mensaje del kit", () => {
    const html = conFormulario();
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(texto(html)).toContain("Aprende a manejar tu dinero. Mejora tu salud financiera.");
  });

  it("muestra el aviso completo, los beneficios y lo que aprenderás", () => {
    const t = texto(conFormulario());
    for (const frase of [
      "Proyecto · Hackathon BBVA",
      "Prototipo educativo con datos sintéticos. Proyecto independiente para hackathon; no es un producto oficial de BBVA. Simulación, no asesoría financiera. No ingreses información sensible.",
      "Un copiloto con IA que te guía para ordenar tus deudas, fortalecer tu historial y descubrir opciones bancarias que se ajusten a ti, paso a paso.",
      "Productos sujetos a evaluación bancaria.",
      "Aprende sin miedo", "Construye tu ruta", "Decide con criterio",
      "Así te ayuda Finance Pro", "Proyecta tu saldo día a día", "Ordena tus deudas", "Te propone cómo evitarlo",
      "Nunca escribas datos reales",
    ])
      expect(t).toContain(frase);
  });

  it("no promete aprobaciones ni se presenta como producto del banco", () => {
    const t = texto(conFormulario());
    expect(t).not.toMatch(/BBVA presenta|Nuevo en BBVA|Ver caso real|aprobado garantizado|pre-?aprobad/i);
    // «producto oficial de BBVA» solo aparece negado en el aviso.
    expect(t.match(/producto oficial de BBVA/g)).toHaveLength(1);
    expect(t).toContain("no es un producto oficial de BBVA");
  });

  it("sin sesión, cada botón envía el ingreso con su opción (funciona aun sin JavaScript)", () => {
    const html = conFormulario();
    const form = html.match(/<form [^>]*>/)?.[0] ?? "";
    for (const a of ['id="portada-ingreso"', 'method="post"', 'action="/api/ingresar"']) expect(form).toContain(a);
    const botones = html.match(/<button [^>]*>/g) ?? [];
    const envia = (v: string) =>
      botones.filter(b => ['type="submit"', 'form="portada-ingreso"', 'name="empezar"', `value="${v}"`].every(a => b.includes(a)));
    const demo = envia("demo");
    const propio = envia("propio");
    expect(demo.length).toBeGreaterThanOrEqual(2);
    expect(propio.length).toBeGreaterThanOrEqual(2);
    expect(texto(html)).toContain("Ver el caso de Andrea");
    expect(texto(html)).toContain("Empezar con mi situación");
  });

  it("con sesión, los botones no envían nada y el error se anuncia", () => {
    const html = conBotones("No se pudo abrir el caso.");
    expect(html).not.toContain("<form");
    expect(html).not.toContain('type="submit"');
    expect(html).toContain('role="alert"');
    expect(texto(html)).toContain("No se pudo abrir el caso.");
  });

  it("menú accesible, enlaces a secciones que existen e imágenes con texto alternativo", () => {
    const html = conFormulario();
    expect(html).toContain('aria-controls="portada-menu"');
    expect(html).toContain('aria-expanded="false"');
    for (const id of ["como-funciona", "aprende", "beneficios"]) {
      expect(html).toContain(`href="#${id}"`);
      expect(html).toContain(`id="${id}"`);
    }
    const imgs = html.match(/<img[^>]*>/g) ?? [];
    expect(imgs.length).toBeGreaterThanOrEqual(2);
    for (const img of imgs) expect(img).toMatch(/alt="/);
    expect(html).toMatch(/alt="Ilustración generada con IA/);
  });
});
