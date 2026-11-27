export function rutValido(value) {
  const clean = value.replace(/[.\s-]/g, "").toUpperCase();
  if (!/^[0-9]{7,8}[0-9K]$/.test(clean)) return false;
  const body = clean.slice(0, -1);
  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const result = 11 - (sum % 11);
  const verifier = result === 11 ? "0" : result === 10 ? "K" : String(result);
  return clean.at(-1) === verifier;
}

export function celularValido(value) {
  const clean = value.replace(/[\s()-]/g, "");
  return /^(?:\+56)?9\d{8}$/.test(clean);
}
