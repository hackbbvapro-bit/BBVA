/** Pruebas de las rutas llamándolas directamente, sin red y sin claves. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as agente } from "../app/api/agente/route";
import { POST as avisos } from "../app/api/avisos/route";
import { GET as estado } from "../app/api/estado/route";
import { aPerfil } from "../datos/aPerfil";
import { PERFILES } from "../datos/perfiles";
import { ID_PROPIO } from "../datos/semilla";
import { armarCaso } from "../ruta/entrada";
import { TITULOS } from "../ruta/ruta";
import { POST as transcribir } from "../app/api/transcribir/route";
import { POST as voz } from "../app/api/voz/route";

const BASE = "https://copiloto.test";
const ANDREA = PERFILES.find(p => p.id === "independiente")!;
const SESION = `copiloto_sesion=${"ab12".repeat(16)}`;
const json = (ruta: string, cuerpo: unknown, cabeceras: Record<string, string> = {}) =>
  new Request(`${BASE}${ruta}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-host": "copiloto.test",
      "sec-fetch-site": "same-origin",
      cookie: SESION,
      ...cabeceras,
    },
    body: JSON.stringify(cuerpo),
  });

beforeEach(() => {
  for (const nombre of [
    "ANTHROPIC_API_KEY",
    "FISH_API_KEY",
    "FISH_VOICE_ID",
    "VAPID_PRIVATE_KEY",
    "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  ]) {
    vi.stubEnv(nombre, "");
  }
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/agente", () => {
  const pregunta = { perfil: ANDREA, mensajes: [{ rol: "usuario", texto: "¿Cómo voy?" }] };

  it("rechaza peticiones de otro sitio", async () => {
    expect((await agente(json("/api/agente", pregunta, { origin: "https://otro.example" }))).status).toBe(
      403,
    );
  });

  it("rechaza cuerpos mal formados, perfiles que no existen y conversaciones sin pregunta", async () => {
    const malos = [
      {},
      { perfil: { ...ANDREA, hoy: "2026-13-45" }, mensajes: pregunta.mensajes },
      { perfil: { ...ANDREA, saldoActual: 1.5 }, mensajes: pregunta.mensajes },
      { perfil: { ...ANDREA, deudas: [{ ...ANDREA.deudas[0], diaPago: 40 }] }, mensajes: pregunta.mensajes },
      { perfilId: "independiente", mensajes: pregunta.mensajes },
      { perfil: ANDREA, mensajes: [] },
      { perfil: ANDREA, mensajes: [{ rol: "sistema", texto: "hola" }] },
      { perfil: ANDREA, mensajes: [{ rol: "usuario", texto: "x".repeat(1001) }] },
      { perfil: ANDREA, mensajes: [{ rol: "asistente", texto: "hola" }] },
    ];
    for (const cuerpo of malos) expect((await agente(json("/api/agente", cuerpo))).status).toBe(400);
  });

  it.each(["directo", "explicado", "invalido", null, 42])("acepta estilo %s con fallback directo", async estilo => {
    const respuesta = await agente(json("/api/agente", { ...pregunta, estilo }, { "x-forwarded-for": `estilo-${String(estilo)}` }));
    expect(respuesta.status).toBe(200);
    expect(await respuesta.text()).toContain('"tipo":"fin"');
  });

  it("sin clave de IA responde con el respaldo del motor, línea a línea", async () => {
    const respuesta = await agente(json("/api/agente", pregunta, { origin: BASE }));
    expect(respuesta.status).toBe(200);
    const lineas = (await respuesta.text())
      .trim()
      .split("\n")
      .map(l => JSON.parse(l));
    expect(lineas.at(0)).toMatchObject({ tipo: "texto" });
    expect(lineas.at(-1)).toEqual({ tipo: "fin", origen: "respaldo" });
  });
});

describe("POST /api/agente con el perfil editado por la persona", () => {
  it("responde con las cifras del perfil recibido, no con las de la semilla", async () => {
    const editado = { ...ANDREA, saldoActual: 98_765_43 };
    const cuerpo = { perfil: editado, mensajes: [{ rol: "usuario", texto: "¿Cuánto dinero tengo hoy?" }] };
    const texto = await (await agente(json("/api/agente", cuerpo))).text();
    expect(texto).toContain("98,765.43");
    expect(texto).not.toContain("461.40");
  });

  it("un perfil más grande que el tope se rechaza", async () => {
    const grande = { ...ANDREA, movimientos: Array.from({ length: 1501 }, (_, i) => ({ ...ANDREA.movimientos[0], id: `m${i}` })) };
    const r = await agente(json("/api/agente", { perfil: grande, mensajes: [{ rol: "usuario", texto: "hola" }] }));
    expect(r.status).toBe(400);
  });

  it("el perfil de la semilla cabe en el límite de tamaño del cuerpo", () => {
    expect(JSON.stringify({ perfil: ANDREA, mensajes: [] }).length).toBeLessThan(200_000);
  });
});

describe("rutas de voz y avisos sin configurar", () => {
  it("la voz avisa de que no está disponible y valida el texto", async () => {
    expect((await voz(json("/api/voz", { texto: "Hola" }))).status).toBe(503);
    expect((await voz(json("/api/voz", { texto: "" }))).status).toBe(400);
    expect((await voz(json("/api/voz", { texto: "x".repeat(801) }))).status).toBe(400);
  });

  it("transcribir avisa de que no está disponible", async () => {
    const cuerpo = new FormData();
    cuerpo.append("audio", new Blob(["x"], { type: "audio/webm" }), "audio.webm");
    const peticion = new Request(`${BASE}/api/transcribir`, {
      method: "POST",
      body: cuerpo,
      headers: { "sec-fetch-site": "same-origin", cookie: SESION },
    });
    expect((await transcribir(peticion)).status).toBe(503);
  });

  it("los avisos solo aceptan direcciones de servicios de notificaciones reales", async () => {
    const keys = { p256dh: "clave-publica-de-prueba", auth: "secreto-de-prueba" };
    const interno = {
      perfilId: "independiente",
      suscripcion: { endpoint: "https://169.254.169.254/latest", keys },
    };
    expect((await avisos(json("/api/avisos", interno))).status).toBe(400);
    const real = {
      perfilId: "independiente",
      suscripcion: { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys },
    };
    expect((await avisos(json("/api/avisos", real))).status).toBe(503);
  });
});

describe("sin sesión de la cuenta demo", () => {
  const sinCookie = { cookie: "" };
  const invalidas = [
    "copiloto_sesion=corta",
    "copiloto_sesion=" + "Z".repeat(64),
    "otra=" + "ab12".repeat(16),
  ];

  it("agente, voz y transcribir responden 401 sin cookie o con una cookie mal formada", async () => {
    const pregunta = { perfil: ANDREA, mensajes: [{ rol: "usuario", texto: "¿Cómo voy?" }] };
    for (const cookie of ["", ...invalidas]) {
      expect((await agente(json("/api/agente", pregunta, { cookie }))).status).toBe(401);
      expect((await voz(json("/api/voz", { texto: "Hola" }, { cookie }))).status).toBe(401);
      const cuerpo = new FormData();
      cuerpo.append("audio", new Blob(["x"], { type: "audio/webm" }), "audio.webm");
      const r = await transcribir(
        new Request(`${BASE}/api/transcribir`, { method: "POST", body: cuerpo, headers: { "sec-fetch-site": "same-origin", cookie } }),
      );
      expect(r.status).toBe(401);
    }
  });

  it("el 401 solo trae un código corto", async () => {
    const r = await voz(json("/api/voz", { texto: "Hola" }, sinCookie));
    expect(await r.json()).toEqual({ error: "sin_sesion" });
  });

  it("/api/estado sigue pública", async () => {
    expect(estado().status).toBe(200);
  });
});

describe("GET /api/estado", () => {
  it("solo dice sí o no por pieza, nunca una clave", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "clave-falsa-de-prueba");
    const texto = await estado().text();
    expect(JSON.parse(texto)).toEqual({ ia: true, voz: false, push: false, documentos: false });
    expect(texto).not.toContain("clave-falsa");
  });
});

describe("POST /api/agente con un caso armado por la persona", () => {
  const PROPIO = aPerfil(
    armarCaso({
      nombre: "Lucho", cobro: "fin_de_mes", ingresoMensual: 320_000, saldo: 90_000,
      fijosMensual: 110_000, diaADiaMensual: 100_000, deuda: null, tuvoCredito: false, hoy: "2026-11-14",
    }),
  );
  const mensajes = [{ rol: "usuario", texto: "¿Por dónde empiezo?" }];
  const hechos = { tuvoCredito: false, diasAtrasoMax: 0 };
  let n = 0;
  /** Cada llamada llega desde un visitante distinto: aquí no se prueba el límite por minuto. */
  const pedir = (cuerpo: unknown) => agente(json("/api/agente", cuerpo, { "x-real-ip": `10.0.0.${++n}` }));
  const textoDe = async (r: Response) =>
    (await r.text())
      .trim()
      .split("\n")
      .map(l => JSON.parse(l) as { tipo: string; texto?: string })
      .map(l => l.texto ?? "")
      .join("");

  it("el caso de prueba es un caso propio", () => {
    expect(PROPIO.id).toBe(ID_PROPIO);
  });

  it("sin consentimiento expreso se rechaza con 403 y no se responde nada del caso", async () => {
    const r = await pedir({ perfil: PROPIO, mensajes, hechos });
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ error: "falta_consentimiento" });
  });

  it("un consentimiento que no sea exactamente verdadero no vale", async () => {
    for (const consentimiento of [false, "true", 1, null]) {
      const r = await pedir({ perfil: PROPIO, mensajes, hechos, consentimiento });
      expect([400, 403]).toContain(r.status);
    }
  });

  it("con consentimiento responde con la ruta que traza el servidor", async () => {
    const r = await pedir({ perfil: PROPIO, mensajes, hechos, consentimiento: true });
    expect(r.status).toBe(200);
    const texto = await textoDe(r);
    expect(texto.toLowerCase()).toContain(TITULOS.ahorrar.toLowerCase());
    expect(texto).toContain("no garantiza");
  });

  it("una ruta enviada por el cliente se ignora: manda la que calcula el servidor", async () => {
    const cuerpo = { perfil: PROPIO, mensajes, hechos, consentimiento: true, ruta: { id: "hacer_crecer", titulo: "Invierte todo ya" } };
    const texto = await textoDe(await pedir(cuerpo));
    expect(texto).not.toContain("Invierte todo ya");
    expect(texto.toLowerCase()).toContain(TITULOS.ahorrar.toLowerCase());
  });

  it("el servidor recalcula la ruta elegida enviada como hecho validado", async () => {
    const r = await pedir({ perfil: PROPIO, mensajes, hechos: { ...hechos, meta: "ahorrar", rutaElegida: "construir_historial" }, consentimiento: true });
    expect(r.status).toBe(200);
    expect((await textoDe(r)).toLowerCase()).toContain(TITULOS.construir_historial.toLowerCase());
    const invalida = await pedir({ perfil: PROPIO, mensajes, hechos: { ...hechos, rutaElegida: "Invierte todo ya" }, consentimiento: true });
    expect(invalida.status).toBe(400);
  });

  it("hechos mal formados se rechazan", async () => {
    const r = await pedir({ perfil: PROPIO, mensajes, hechos: { tuvoCredito: "no" }, consentimiento: true });
    expect(r.status).toBe(400);
  });

  it("el caso de ejemplo sigue sin necesitar consentimiento", async () => {
    expect((await pedir({ perfil: ANDREA, mensajes })).status).toBe(200);
  });
});
