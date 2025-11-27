const toFixed = (num) => Number(num.toFixed(2));

function range(start, end, step) {
  const out = [];
  if (!step) return out;
  if (start <= end && step > 0) {
    for (let v = start; v <= end + 1e-9; v += step) out.push(toFixed(v));
  } else if (start >= end && step < 0) {
    for (let v = start; v >= end - 1e-9; v += step) out.push(toFixed(v));
  }
  return out;
}

export const SPH_VALUES = range(-20, 20, 0.25);
export const CYL_VALUES = range(0, -15, -0.25); // incluye 0 y negativos
export const ADD_VALUES = range(1, 4, 0.25);
export const AXIS_VALUES = Array.from({ length: 181 }, (_, i) => i); // 0..180
export const PD_VALUES = Array.from({ length: 36 }, (_, i) => 45 + i); // 45..80

export function normalizeRxValue(rx) {
  const emptyEye = { sph: null, cyl: null, axis: null, add: null };
  return {
    od: { ...emptyEye, ...(rx?.od || {}) },
    os: { ...emptyEye, ...(rx?.os || {}) },
    pd: {
      distance: rx?.pd?.distance ?? null,
      near: rx?.pd?.near ?? null,
    },
    notes: rx?.notes || "",
  };
}
