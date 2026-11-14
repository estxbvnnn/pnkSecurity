/**
 * Convierte un nombre de restaurante en un slug para la URL pública
 * (ej. "África Restobar" -> "africarestobar"), para no exponer el id
 * numérico secuencial en la URL (evita enumerar restaurantes por id).
 */
export function slugify(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos/diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ""); // solo letras/números, sin separadores
}
