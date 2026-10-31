// Generates the Ed25519 license keypair. Prints it; stores nothing.
import crypto from "node:crypto";

const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
const spki = publicKey.export({ type: "spki", format: "der" });
console.log("LICENSE_PRIVATE_KEY (secret, PKCS8 base64):");
console.log(privateKey.export({ type: "pkcs8", format: "der" }).toString("base64"));
console.log("\nLICENSE_PUBLIC_KEY_RAW (32 bytes base64; also CAPTURITA_LICENSE_PUBKEY when building the app):");
console.log(spki.subarray(spki.length - 32).toString("base64"));
