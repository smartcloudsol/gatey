function fill(buf) {
  if (globalThis.crypto?.getRandomValues) {
    return globalThis.crypto.getRandomValues(buf);
  }
  throw new Error("No secure random source available");
}

export function randomBytes(size) {
  const b = Buffer.allocUnsafe(size);
  fill(b);
  return b;
}

export function randomFillSync(buf) {
  fill(buf);
  return buf;
}

export default {
  randomBytes,
  randomFillSync,
}