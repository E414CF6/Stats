import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

let cachedPrivateKey: string | null = null;

function loadPrivateKey(): string | null {
  if (cachedPrivateKey) {
    return cachedPrivateKey;
  }

  // 1. Check environment variable containing PEM directly (recommended for Vercel)
  const envKey = process.env.RSA_PRIVATE_KEY?.trim();
  if (envKey) {
    // If the PEM in env var has literal \n instead of real newlines, convert them
    cachedPrivateKey = envKey.replace(/\\n/g, "\n");
    return cachedPrivateKey;
  }

  // 2. Check path specified in environment variable
  const envPath = process.env.RSA_PRIVATE_KEY_PATH?.trim();
  if (envPath) {
    const resolved = path.isAbsolute(envPath) ? envPath : path.resolve(/* turbopackIgnore: true */ process.cwd(), envPath);
    if (fs.existsSync(/* turbopackIgnore: true */ resolved)) {
      cachedPrivateKey = fs.readFileSync(/* turbopackIgnore: true */ resolved, "utf8");
      return cachedPrivateKey;
    }
  }

  // 3. Fallback candidate paths
  const candidatePaths = [
    path.resolve(/* turbopackIgnore: true */ process.cwd(), "keys", "private_key.pem"),
    path.resolve(/* turbopackIgnore: true */ process.cwd(), "..", "Serve", "keys", "private_key.pem"),
    path.resolve(/* turbopackIgnore: true */ process.cwd(), "..", "keys", "private_key.pem"),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(/* turbopackIgnore: true */ candidate)) {
      try {
        cachedPrivateKey = fs.readFileSync(/* turbopackIgnore: true */ candidate, "utf8");
        return cachedPrivateKey;
      } catch {
        // ignore and check next
      }
    }
  }

  return null;
}

/**
 * Generates the required RSA-SHA256 signature and timestamp headers for remote API calls.
 *
 * @param method HTTP method (e.g. "GET")
 * @param path Request path without query string (e.g. "/api/stats")
 */
export function getRsaAuthHeaders(method: string, path: string): Record<string, string> {
  const privateKeyPem = loadPrivateKey();
  if (!privateKeyPem) {
    return {};
  }

  const timestamp = Date.now().toString();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const dataToSign = `${method.toUpperCase()}\n${normalizedPath}\n${timestamp}`;

  try {
    const signer = crypto.createSign("SHA256");
    signer.update(dataToSign);
    signer.end();
    const signature = signer.sign(privateKeyPem, "base64");

    return {
      "x-api-signature": signature,
      "x-api-timestamp": timestamp,
    };
  } catch (err) {
    console.error("[RSA Auth] Failed to generate RSA signature:", err);
    return {};
  }
}
