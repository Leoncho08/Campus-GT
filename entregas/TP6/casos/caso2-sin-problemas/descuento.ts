// Calcula el precio final aplicando un porcentaje de descuento.
export function calcDesc(p: number, pct: number): number {
  if (!Number.isFinite(p) || !Number.isFinite(pct)) {
    throw new RangeError("El precio y el porcentaje tienen que ser números.");
  }
  if (p < 0) {
    throw new RangeError("El precio no puede ser negativo.");
  }
  if (pct < 0 || pct > 100) {
    throw new RangeError("El porcentaje va de 0 a 100.");
  }

  const r = p - (p * pct) / 100;
  return Math.round(r * 100) / 100;
}
