/** Las fotos de un restaurante y las de sus productos viven en la misma carpeta /imagenes/cod{id}/ (ver middlewares/upload.ts del backend). */
export function fotoUrl(restauranteId: number, foto: string | null): string | null {
  return foto ? `/imagenes/cod${restauranteId}/${foto}` : null;
}

export function formatearCLP(monto: number): string {
  return `$ ${Math.round(monto).toLocaleString("es-CL")}`;
}
