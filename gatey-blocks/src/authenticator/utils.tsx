import { AuthenticatorConfig } from "@smart-cloud/gatey-core";

const obfuscate = (str: string, key: number): string => {
  return str
    .split("")
    .map((char) => String.fromCharCode(char.charCodeAt(0) ^ key))
    .join("");
};

const createKey = async (salt: number): Promise<CryptoKey> => {
  const k = obfuscate('zf"[i[dzlHJtEga{ybauXYA`jb~H\\^AG:j4c[^>=F^\\0', salt);
  const keyBuffer = Uint8Array.from(atob(k), (c) => c.charCodeAt(0));
  return window.crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "AES-CBC", length: 256 },
    false,
    ["decrypt"]
  );
};

export const decryptData = async (
  encryptedText: string,
  salt: number
): Promise<AuthenticatorConfig | undefined> => {
  try {
    const [ivBase64, encryptedBase64] = encryptedText.split(":");
    const key = await createKey(salt);
    const iv = new Uint8Array(
      atob(ivBase64)
        .split("")
        .map((c) => c.charCodeAt(0))
    );
    const encryptedData = new Uint8Array(
      atob(encryptedBase64)
        .split("")
        .map((c) => c.charCodeAt(0))
    );
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-CBC", iv },
      key,
      encryptedData
    );
    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch (err) {
    console.error(err);
    return undefined;
  }
};
