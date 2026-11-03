/**
 * Valida que un valor (query param, body, etc.) sea un entero positivo.
 * Equivalente a id_valido() del proyecto pnkSecurity (PHP): nunca se confía
 * en el valor crudo de la URL/formulario antes de usarlo en una consulta.
 */
export function idValido(valor: unknown): number | null {
  if (valor === undefined || valor === null || valor === "") return null;
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}
