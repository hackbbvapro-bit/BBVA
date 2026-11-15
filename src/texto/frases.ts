/** Conserva separadores y decimales; solo libera oraciones terminadas con separación. */
export function extraerFrases(texto: string, final = false): { frases: string[]; resto: string } {
  const frases: string[] = [];
  const fin = /[.!?…]+["»”)]*(?:\s+|$)/g;
  let inicio = 0;
  for (const m of texto.matchAll(fin)) {
    const hasta = m.index! + m[0].length;
    if (!final && hasta === texto.length && !/\s$/.test(m[0])) break;
    frases.push(texto.slice(inicio, hasta));
    inicio = hasta;
  }
  if (final && inicio < texto.length) { frases.push(texto.slice(inicio)); inicio = texto.length; }
  return { frases, resto: texto.slice(inicio) };
}
