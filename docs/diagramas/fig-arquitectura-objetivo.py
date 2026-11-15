"""Arquitectura objetivo del copiloto como módulo de la app BBVA (C4, nivel 3: componentes del Servicio Copiloto).

No describe el MVP actual (ver fig-componentes.py): es la propuesta para una implementación desde cero.
Uso (con matplotlib):
    python docs/diagramas/fig-arquitectura-objetivo.py
Salida: fig-arquitectura-objetivo.pdf (vectorial) y fig-arquitectura-objetivo.png (300 dpi), junto a este archivo.
"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle, Ellipse, Rectangle

plt.rcParams["font.family"] = ["Arial", "DejaVu Sans"]
plt.rcParams["pdf.fonttype"] = 42

# Paleta C4 estándar
PERSONA, CONTENEDOR, COMPONENTE, EXTERNO = "#08427b", "#438dd5", "#85bbf0", "#999999"
B_PERSONA, B_CONT, B_COMP, B_EXT = "#073b6f", "#3c7fc0", "#5d82a8", "#8a8a8a"
LIMITE, LINEA, TEXTO = "#666666", "#555555", "#222222"

W, H = 11.6, 8.75
fig = plt.figure(figsize=(W, H))
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, W)
ax.set_ylim(0, H)
ax.axis("off")

CW, CH, EW = 1.6, 1.05, 1.7


def caja(cx, cy, w, h, titulo, tipo, desc, fc, ec, ct):
    ax.add_patch(FancyBboxPatch((cx - w / 2, cy - h / 2), w, h, boxstyle="round,pad=0,rounding_size=0.06",
                                fc=fc, ec=ec, lw=1.0, zorder=3))
    ax.text(cx, cy + h / 2 - 0.13, titulo, ha="center", va="top", fontsize=7.6, fontweight="bold", color=ct, zorder=4)
    ax.text(cx, cy + h / 2 - 0.35, f"[{tipo}]", ha="center", va="top", fontsize=5.9, color=ct, zorder=4)
    ax.text(cx, cy - 0.06, desc, ha="center", va="top", fontsize=6.3, color=ct, linespacing=1.25, zorder=4)


def componente(cx, cy, titulo, tec, desc):
    caja(cx, cy, CW, CH, titulo, f"Componente: {tec}", desc, COMPONENTE, B_COMP, "#000000")


def contenedor(cx, cy, titulo, tec, desc, w=CW):
    caja(cx, cy, w, CH, titulo, f"Contenedor: {tec}", desc, CONTENEDOR, B_CONT, "#ffffff")


def externo(cx, cy, titulo, tipo, desc):
    caja(cx, cy, EW, CH, titulo, tipo, desc, EXTERNO, B_EXT, "#ffffff")


def base_datos(cx, cy, w, h, titulo, tec, desc):
    eh = 0.16
    x, y = cx - w / 2, cy - h / 2
    ax.add_patch(Ellipse((cx, y + eh / 2), w, eh, fc=CONTENEDOR, ec=B_CONT, lw=1.0, zorder=3))
    ax.add_patch(Rectangle((x, y + eh / 2), w, h - eh, fc=CONTENEDOR, ec="none", zorder=3))
    ax.plot([x, x], [y + eh / 2, y + h - eh / 2], color=B_CONT, lw=1.0, zorder=3)
    ax.plot([x + w, x + w], [y + eh / 2, y + h - eh / 2], color=B_CONT, lw=1.0, zorder=3)
    ax.add_patch(Ellipse((cx, y + h - eh / 2), w, eh, fc="#5a9de0", ec=B_CONT, lw=1.0, zorder=4))
    ax.text(cx, y + h - 0.22, titulo, ha="center", va="top", fontsize=7.6, fontweight="bold", color="white", zorder=5)
    ax.text(cx, y + h - 0.42, f"[Contenedor: {tec}]", ha="center", va="top", fontsize=5.9, color="white", zorder=5)
    ax.text(cx, y + h - 0.6, desc, ha="center", va="top", fontsize=6.3, color="white", zorder=5)


def persona(cx, ybase, titulo, desc):
    w, h = 1.9, 0.62
    ax.add_patch(FancyBboxPatch((cx - w / 2, ybase), w, h, boxstyle="round,pad=0,rounding_size=0.18",
                                fc=PERSONA, ec=B_PERSONA, lw=1.0, zorder=3))
    ax.add_patch(Circle((cx, ybase + h + 0.16), 0.2, fc=PERSONA, ec=B_PERSONA, lw=1.0, zorder=3))
    ax.text(cx, ybase + h - 0.1, titulo, ha="center", va="top", fontsize=7.6, fontweight="bold", color="white", zorder=4)
    ax.text(cx, ybase + h - 0.29, "[Persona]", ha="center", va="top", fontsize=5.9, color="white", zorder=4)
    ax.text(cx, ybase + 0.07, desc, ha="center", va="bottom", fontsize=6.2, color="white", zorder=4)


def limite(x0, y0, x1, y1, titulo, tipo):
    ax.add_patch(Rectangle((x0, y0), x1 - x0, y1 - y0, fc="none", ec=LIMITE, lw=0.9, ls=(0, (5, 3)), zorder=1))
    ax.text(x1 - 0.1, y0 + 0.2, titulo, ha="right", va="bottom", fontsize=7.4, fontweight="bold", color=TEXTO, zorder=2)
    ax.text(x1 - 0.1, y0 + 0.07, f"[{tipo}]", ha="right", va="bottom", fontsize=5.9, color=TEXTO, zorder=2)


def relacion(p, q, texto, tx, ty, ha="center"):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=8, lw=0.9, color=LINEA,
                                 ls=(0, (4, 2)), shrinkA=0, shrinkB=0, zorder=2))
    ax.text(tx, ty, texto, ha=ha, va="center", fontsize=5.8, color=TEXTO, linespacing=1.2, zorder=5,
            bbox=dict(fc="white", ec="none", pad=0.6))


# geometría
c1, c2, c3 = 6.05, 8.05, 10.05   # columnas del servicio
izq, med = 1.2, 3.45            # columnas fuera del servicio
r0, r1, r2, r3 = 7.65, 5.95, 4.35, 2.75
arriba, abajo = CH / 2, -CH / 2

# límite del servicio
limite(4.95, 2.0, 11.1, 6.75, "Servicio Copiloto", "Contenedor: backend")

# fila superior: persona y sistemas externos
persona(izq, 7.25, "Cliente BBVA", "Revisa su plata y conversa")
externo(c1, r0, "Fish Audio", "Sistema externo", "Texto a voz y dictado")
externo(c2, r0, "API de Anthropic", "Sistema externo", "Modelo Claude")
externo(c3, r0, "Servicios de push", "Sistema externo", "FCM, APNs")

# contenedores existentes de BBVA
contenedor(izq, r1, "App BBVA", "app móvil, existente", "Módulo Copiloto: solo\nmuestra y conversa")
contenedor(med, r1, "API Gateway BBVA", "existente", "Autentica la sesión\nbancaria (OAuth 2)")
externo(med, r3, "Core bancario", "Sistema existente de BBVA", "Cuentas, movimientos,\ntarjetas y préstamos")

# componentes del servicio
componente(c1, r1, "API del copiloto", "REST", "Arma el contexto con el id\ndel cliente, nunca del celular")
componente(c2, r1, "Agente de IA", "Anthropic SDK", "Explica el resultado con\nherramientas; no calcula")
componente(c3, r1, "Programador de avisos", "tarea diaria", "Recalcula y avisa aunque\nla app esté cerrada")
componente(c1, r2, "Agregador de datos", "dominio", "Une banco y lo declarado;\netiqueta el origen de cada dato")
componente(c2, r2, "Motor de cálculo", "dominio", "Única fuente de los números;\nresultado versionado")
componente(c3, r2, "Registro de trazas", "auditoría", "Guarda entradas, versión,\nherramientas y respuestas")
componente(c1, r3, "Conector bancario", "adaptador", "MVP: datos sintéticos con el\nmismo formato que el banco")

# base de datos del servicio
base_datos(c2, 0.98, 2.1, 0.98, "Base del copiloto", "PostgreSQL", "Datos declarados, resultados y trazas")

# relaciones: entrada
relacion((izq, 7.25), (izq, r1 + arriba), "Usa\n[app móvil]", izq + 0.1, 6.85, ha="left")
relacion((izq + CW / 2, r1), (med - CW / 2, r1), "Llama\n[HTTPS]", (izq + med) / 2, r1 + 0.22)
relacion((med + CW / 2, r1), (c1 - CW / 2, r1), "Reenvía con id\nde cliente [REST]", 4.75, r1 + 0.22)

# relaciones: dentro del servicio
relacion((c1 + CW / 2, r1 + 0.25), (c2 - CW / 2, r1 + 0.25), "Pasa la\npregunta", (c1 + c2) / 2, r1 + 0.45)
relacion((c1 + 0.55, r1 + abajo), (c2 - 0.55, r2 + arriba), "Pide el\nanálisis", (c1 + c2) / 2, 5.1)
relacion((c2, r1 + abajo), (c2, r2 + arriba), "Consulta cifras\n[herramientas]", c2, 5.1)
relacion((c3 - 0.55, r1 + abajo), (c2 + 0.55, r2 + arriba), "Recalcula\ncada día", (c2 + c3) / 2, 5.1)
relacion((c2 - CW / 2, r2), (c1 + CW / 2, r2), "Pide datos\ncon origen", (c1 + c2) / 2, r2 + 0.2)
relacion((c2 + CW / 2, r2), (c3 - CW / 2, r2), "Registra\ncada cálculo", (c2 + c3) / 2, r2 + 0.2)
relacion((c1, r2 + abajo), (c1, r3 + arriba), "Trae productos\ny movimientos", c1, 3.55)
relacion((c1 - CW / 2, r3), (med + EW / 2, r3), "Consulta\n[API interna]", 4.75, r3 + 0.2)

# relaciones: hacia la base de datos
relacion((c1 + CW / 2, r2 - 0.35), (c2 - 0.6, 1.47), "Lee y guarda lo\ndeclarado [SQL]", 7.3, 2.45)
relacion((c2, r2 + abajo), (c2, 1.47), "Guarda el resultado\nversionado [SQL]", c2, 2.85)
relacion((c3 - 0.5, r2 + abajo), (c2 + 0.75, 1.47), "Escribe\ntrazas [SQL]", 9.1, 2.95)

# relaciones: hacia los externos
relacion((c1, r1 + arriba), (c1, r0 + abajo), "Pide audio\n[HTTPS]", c1, 6.82)
relacion((c2, r1 + arriba), (c2, r0 + abajo), "Pide la explicación\n[Messages API]", c2, 6.82)
relacion((c3, r1 + arriba), (c3, r0 + abajo), "Envía avisos\n[Web Push]", c3, 6.82)

# leyenda
lx, ly = 0.2, 0.3
ax.text(lx, ly + 0.5, "Arquitectura objetivo (C4, nivel 3) · Copiloto como módulo de la app BBVA", ha="left",
        va="center", fontsize=7.6, fontweight="bold", color=TEXTO)
ax.text(lx, ly, "Leyenda", ha="left", va="center", fontsize=7, fontweight="bold", color=TEXTO)
items = [(PERSONA, B_PERSONA, "Persona"), (CONTENEDOR, B_CONT, "Contenedor"), (COMPONENTE, B_COMP, "Componente"),
         (EXTERNO, B_EXT, "Sistema externo o existente")]
x = lx + 0.75
for fc, ec, txt in items:
    ax.add_patch(FancyBboxPatch((x, ly - 0.09), 0.3, 0.18, boxstyle="round,pad=0,rounding_size=0.03", fc=fc, ec=ec, lw=0.8))
    ax.text(x + 0.38, ly, txt, ha="left", va="center", fontsize=6.4, color=TEXTO)
    x += 1.2 if txt != "Sistema externo o existente" else 2.05
ax.add_patch(Rectangle((x, ly - 0.09), 0.3, 0.18, fc="none", ec=LIMITE, lw=0.8, ls=(0, (3, 2))))
ax.text(x + 0.38, ly, "Límite", ha="left", va="center", fontsize=6.4, color=TEXTO)

here = os.path.dirname(os.path.abspath(__file__))
fig.savefig(os.path.join(here, "fig-arquitectura-objetivo.pdf"))
fig.savefig(os.path.join(here, "fig-arquitectura-objetivo.png"), dpi=300)
print("ok")
