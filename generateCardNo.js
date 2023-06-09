const charSet =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const size = 13;

export function generateCardNo() {
  return (
    "garten-" +
    Array.from(
      crypto.getRandomValues(new Uint8Array(size)),
      (x) => charSet[x % charSet.length]
    ).join("")
  );
}

export const entropyBits = Math.log2(charSet.length) * size;

if (import.meta.path === Bun.main) {
  console.log("example card number:", generateCardNo());
  console.log("bits of entropy:", entropyBits);
}
