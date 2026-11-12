#!/usr/bin/env node
/**
 * Serve RSA Key Generator (Node.js)
 * Generates 2048-bit RSA key pair for API authentication between Viewer and Serve
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIEWER_DIR = path.resolve(__dirname, "..");
const SERVE_DIR = path.resolve(VIEWER_DIR, "..", "Serve");

console.log("Generating 2048-bit RSA Key Pair...");

const {publicKey, privateKey} = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
        type: "spki",
        format: "pem",
    },
    privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
    },
});

const viewerKeysDir = path.join(VIEWER_DIR, "keys");
if (!fs.existsSync(viewerKeysDir)) {
    fs.mkdirSync(viewerKeysDir, {recursive: true});
}

const serveKeysDir = path.join(SERVE_DIR, "keys");
if (!fs.existsSync(serveKeysDir)) {
    fs.mkdirSync(serveKeysDir, {recursive: true});
}

const viewerPrivPath = path.join(viewerKeysDir, "private_key.pem");
const servePubPath = path.join(serveKeysDir, "public_key.pem");
const servePrivPath = path.join(serveKeysDir, "private_key.pem");

fs.writeFileSync(viewerPrivPath, privateKey, {encoding: "utf8", mode: 0o600});
fs.writeFileSync(servePubPath, publicKey, {encoding: "utf8"});
fs.writeFileSync(servePrivPath, privateKey, {encoding: "utf8", mode: 0o600});

console.log("\nRSA keys generated successfully!");
console.log(`  - Viewer Private Key: ${viewerPrivPath}`);
console.log(`  - Serve Public Key:   ${servePubPath}`);
console.log(`  - Serve Private Key:  ${servePrivPath}`);

const singleLinePriv = privateKey.replace(/\r?\n/g, "\\n");

console.log("\n=======================================================");
console.log("For Vercel or Viewer .env.local configuration:");
console.log("=======================================================");
console.log(`RSA_PRIVATE_KEY="${singleLinePriv}"`);
console.log("=======================================================\n");
