"""Diagrama de componentes C4 (nivel 3) del copiloto anticipador.

Uso (con matplotlib):
    python docs/diagramas/fig-componentes.py
Salida: fig-componentes.pdf (vectorial) y fig-componentes.png (300 dpi), junto a este archivo.
"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle, Rectangle

plt.rcParams["font.family"] = ["Arial", "DejaVu Sans"]
plt.rcParams["pdf.fonttype"] = 42

# Paleta C4 estándar
PERSONA, COMPONENTE, EXTERNO = "#08427b", "#85bbf0", "#999999"
BORDE_PERSONA, BORDE_COMP, BORDE_EXT = "#073b6f", "#5d82a8", "#8a8a8a"
LIMITE, LINEA, TEXTO = "#666666", "#555555", "#222222"

W, H = 12.9, 7.1
fig = plt.figure(figsize=(W, H))
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, W)
ax.set_ylim(0, H)
ax.axis("off")

CW, CH = 1.6, 1.05      # componente del servidor
BW = 1.35               # componente del navegador (más angosto)
EW = 1.7                # sistema externo


def caja(cx, cy, w, h, titulo, tipo, desc, fc, ec, color_texto):
    ax.add_patch(FancyBboxPatch((cx - w / 2, cy - h / 2), w, h, boxstyle="round,pad=0,rounding_size=0.06",
                                fc=fc, ec=ec, lw=1.0, zorder=3))
    ax.text(cx, cy + h / 2 - 0.13, titulo, ha="center", va="top", fontsize=7.6, fontweight="bold",
            color=color_texto, zorder=4)
    ax.text(cx, cy + h / 2 - 0.35, f"[{tipo}]", ha="center", va="top", fontsize=5.9, color=color_texto, zorder=4)
    ax.text(cx, cy - 0.06, desc, ha="center", va="top", fontsize=6.3, color=color_texto, linespacing=1.25, zorder=4)


def componente(cx, cy, titulo, tecnologia, desc, w=CW):
    caja(cx, cy, w, CH, titulo, f"Componente: {tecnologia}", desc, COMPONENTE, BORDE_COMP, "#000000")


def externo(cx, cy, titulo, desc):
    caja(cx, cy, EW, CH, titulo, "Sistema externo", desc, EXTERNO, BORDE_EXT, "#ffffff")


def persona(cx, ybase, titulo, desc):
    w, h = 1.9, 0.62
    ax.add_patch(FancyBboxPatch((cx - w / 2, ybase), w, h, boxstyle="round,pad=0,rounding_size=0.18",
                                fc=PERSONA, ec=BORDE_PERSONA, lw=1.0, zorder=3))
    ax.add_patch(Circle((cx, ybase + h + 0.16), 0.2, fc=PERSONA, ec=BORDE_PERSONA, lw=1.0, zorder=3))
    ax.text(cx, ybase + h - 0.1, titulo, ha="center", va="top", fontsize=7.6, fontweight="bold", color="white", zorder=4)
    ax.text(cx, ybase + h - 0.29, "[Persona]", ha="center", va="top", fontsize=5.9, color="white", zorder=4)
    ax.text(cx, ybase + 0.07, desc, ha="center", va="bottom", fontsize=6.2, color="white", zorder=4)


def limite(x0, y0, x1, y1, titulo, tipo):
    ax.add_patch(Rectangle((x0, y0), x1 - x0, y1 - y0, fc="none", ec=LIMITE, lw=0.9, ls=(0, (5, 3)), zorder=1))
    ax.text(x0 + 0.1, y0 + 0.2, titulo, ha="left", va="bottom", fontsize=7.4, fontweight="bold", color=TEXTO, zorder=2)
    ax.text(x0 + 0.1, y0 + 0.07, f"[{tipo}]", ha="left", va="bottom", fontsize=5.9, color=TEXTO, zorder=2)


def relacion(p, q, texto, tx, ty, ha="center"):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=8, lw=0.9, color=LINEA,
                                 ls=(0, (4, 2)), shrinkA=0, shrinkB=0, zorder=2))
    ax.text(tx, ty, texto, ha=ha, va="center", fontsize=5.8, color=TEXTO, linespacing=1.2, zorder=5,
            bbox=dict(fc="white", ec="none", pad=0.6))


# filas y columnas
r1, r2, r3 = 4.85, 3.30, 1.75
nav = [1.15, 2.65, 4.15]       # columnas del navegador
srv_izq, srv_der = 6.75, 8.95  # columnas del servidor
ext = 11.5
top, bot = r1 + CH / 2, r1 - CH / 2

# límites
limite(0.15, 0.6, 10.3, 5.95, "Copiloto anticipador", "Sistema de software")
limite(0.3, 2.45, 5.0, 5.7, "Aplicación en el navegador", "Contenedor: React 19, PWA")
limite(5.6, 0.78, 10.1, 5.7, "Servidor web", "Contenedor: Next.js 16 en Vercel")

# persona
persona(nav[1], 6.08, "Persona usuaria", "Revisa su plata y conversa con el copiloto")

# navegador
componente(nav[1], r1, "Pantallas de la app", "React + Tailwind", "Hoy, Deudas, Mi dinero,\nHablar y avisos", w=1.9)
componente(nav[0], r2, "Repositorio local", "PGlite", "Guarda los datos solo\nen el navegador", w=BW)
componente(nav[1], r2, "Motor de cálculo", "TypeScript", "Proyecta 30 días, ordena\ndeudas y propone jugadas", w=BW)
componente(nav[2], r2, "Clientes de API", "fetch", "Llaman al servidor y leen\nla respuesta por partes", w=BW)

# servidor
componente(srv_izq, r2, "Control de acceso", "Next.js proxy", "Sesión, mismo origen y\nlímite de peticiones")
componente(srv_izq, r3, "Motor de cálculo", "TypeScript", "El mismo módulo: da las\ncifras a las herramientas")
componente(srv_der, r1, "API de avisos", "Route Handler", "Suscribe el celular y\nenvía notificaciones")
componente(srv_der, r2, "API de voz", "Route Handler", "Texto a voz y dictado;\nsi falla, voz del celular")
componente(srv_der, r3, "Agente conversacional", "Anthropic SDK", "Explica con herramientas;\nsi falla, responde sin IA")

# sistemas externos
externo(ext, r1, "Servicios de push", "FCM, Apple, Mozilla")
externo(ext, r2, "Fish Audio", "Voz y transcripción")
externo(ext, r3, "API de Anthropic", "Modelo Claude")

# relaciones: persona y navegador
relacion((nav[1], 6.08), (nav[1], top), "Usa\n[HTTPS, celular]", nav[1] + 0.12, 5.73, ha="left")
relacion((nav[1] - 0.6, bot), (nav[0] + 0.1, r2 + CH / 2), "Lee y guarda", 1.55, 4.07)
relacion((nav[1], bot), (nav[1], r2 + CH / 2), "Calcula con", nav[1], 4.07)
relacion((nav[1] + 0.6, bot), (nav[2] - 0.1, r2 + CH / 2), "Pide agente,\nvoz y avisos", 3.75, 4.07)

# navegador -> servidor
relacion((nav[2] + BW / 2, r2), (srv_izq - CW / 2, r2), "Llama a la API\n[JSON/HTTPS]", 5.38, r2 + 0.22)

# dentro del servidor
relacion((srv_izq + 0.45, r2 + CH / 2), (srv_der - CW / 2, r1 - 0.2), "/api/avisos", 7.75, 4.22)
relacion((srv_izq + CW / 2, r2), (srv_der - CW / 2, r2), "/api/voz", 7.85, r2 + 0.13)
relacion((srv_izq + 0.45, r2 - CH / 2), (srv_der - CW / 2, r3 + 0.2), "/api/agente", 7.75, 2.38)
relacion((srv_der - CW / 2, r3 - 0.25), (srv_izq + CW / 2, r3 - 0.25), "Consulta cifras\n[herramientas]", 7.85, r3 - 0.05)

# servidor -> externos
relacion((srv_der + CW / 2, r1), (ext - EW / 2, r1), "Envía\n[Web Push]", 10.2, r1 + 0.22)
relacion((srv_der + CW / 2, r2), (ext - EW / 2, r2), "Pide audio\n[HTTPS]", 10.2, r2 + 0.22)
relacion((srv_der + CW / 2, r3), (ext - EW / 2, r3), "Pide la explicación\n[Messages API]", 10.2, r3 + 0.22)

# leyenda
lx, ly = 0.2, 0.32
ax.text(lx, ly, "Leyenda", ha="left", va="center", fontsize=7, fontweight="bold", color=TEXTO)
items = [(PERSONA, BORDE_PERSONA, "Persona"), (COMPONENTE, BORDE_COMP, "Componente"), (EXTERNO, BORDE_EXT, "Sistema externo")]
x = lx + 0.75
for fc, ec, txt in items:
    ax.add_patch(FancyBboxPatch((x, ly - 0.09), 0.3, 0.18, boxstyle="round,pad=0,rounding_size=0.03", fc=fc, ec=ec, lw=0.8))
    ax.text(x + 0.38, ly, txt, ha="left", va="center", fontsize=6.4, color=TEXTO)
    x += 1.55
ax.add_patch(Rectangle((x, ly - 0.09), 0.3, 0.18, fc="none", ec=LIMITE, lw=0.8, ls=(0, (3, 2))))
ax.text(x + 0.38, ly, "Límite (sistema o contenedor)", ha="left", va="center", fontsize=6.4, color=TEXTO)
x += 2.35
ax.add_patch(FancyArrowPatch((x, ly), (x + 0.4, ly), arrowstyle="-|>", mutation_scale=7, lw=0.8, color=LINEA, ls=(0, (4, 2))))
ax.text(x + 0.5, ly, "Relación [tecnología]", ha="left", va="center", fontsize=6.4, color=TEXTO)

ax.text(W - 0.2, ly, "Diagrama de componentes (C4, nivel 3) · Copiloto anticipador", ha="right", va="center",
        fontsize=7.4, fontweight="bold", color=TEXTO)

here = os.path.dirname(os.path.abspath(__file__))
fig.savefig(os.path.join(here, "fig-componentes.pdf"))
fig.savefig(os.path.join(here, "fig-componentes.png"), dpi=300)
print("ok")
