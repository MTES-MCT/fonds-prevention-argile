import crypto from "crypto";
import { getServerEnv } from "@/shared/config/env.config";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Récupère la clé de chiffrement depuis les variables d'environnement
 * @throws {Error} Si la clé n'est pas configurée ou invalide
 */
function getEncryptionKey(): Buffer {
  const key = getServerEnv().RGA_ENCRYPTION_KEY;

  if (!key) {
    throw new Error("RGA_ENCRYPTION_KEY not configured");
  }

  // Vérifier que la clé est bien en hex et fait 32 bytes (64 caractères hex)
  if (key.length !== 64) {
    throw new Error("RGA_ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  }

  // Valider le format hexadécimal avant de créer le Buffer
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error("RGA_ENCRYPTION_KEY must be a valid hex string");
  }

  return Buffer.from(key, "hex");
}

/**
 * Chiffre des données avec AES-256-GCM
 *
 * Format retourné : iv:authTag:encrypted (en hex)
 * - iv: Initialization Vector (16 bytes)
 * - authTag: Authentication Tag (16 bytes)
 * - encrypted: Données chiffrées (taille variable)
 *
 * @param data - Données en texte clair à chiffrer
 * @returns Chaîne chiffrée au format "iv:authTag:encrypted"
 * @throws {Error} Si le chiffrement échoue
 */
export function encryptData(data: string): string {
  if (!data || typeof data !== "string") {
    throw new Error("Data must be a non-empty string");
  }

  const key = getEncryptionKey();

  try {
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Format : iv:authTag:encrypted
    const result = [
      iv.toString("hex"),
      authTag.toString("hex"),
      encrypted,
    ].join(":");

    return result;
  } catch (error) {
    console.error("[Encryption Service] Encryption failed:", error);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Déchiffre des données chiffrées avec AES-256-GCM
 *
 * @param encrypted - Chaîne chiffrée au format "iv:authTag:encrypted"
 * @returns Données déchiffrées en texte clair
 * @throws {Error} Si le déchiffrement échoue ou le format est invalide
 */
export function decryptData(encrypted: string): string {
  if (!encrypted || typeof encrypted !== "string") {
    throw new Error("Encrypted data must be a non-empty string");
  }

  const parts = encrypted.split(":");

  if (parts.length !== 3) {
    throw new Error(
      'Invalid encrypted format, expected "iv:authTag:encrypted"'
    );
  }

  const [ivHex, authTagHex, encryptedData] = parts;

  const key = getEncryptionKey();

  try {
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    // Validation des tailles
    if (iv.length !== IV_LENGTH) {
      throw new Error(
        `Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`
      );
    }

    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error(
        `Invalid auth tag length: expected ${AUTH_TAG_LENGTH}, got ${authTag.length}`
      );
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("[Encryption Service] Decryption failed:", error);

    if (
      error instanceof Error &&
      error.message.includes("Unsupported state or unable to authenticate data")
    ) {
      throw new Error(
        "Authentication failed: data may have been tampered with"
      );
    }

    if (error instanceof Error && error.message.startsWith("Invalid")) {
      throw error;
    }

    throw new Error("Failed to decrypt data");
  }
}
