import { Injectable } from "@nestjs/common";
import { createHash } from "crypto";

/**
 * Generates SHA-256 content hashes for duplicate detection.
 * Normalizes text before hashing to catch near-identical content
 * (e.g. extra whitespace, different casing).
 */
@Injectable()
export class ContentHashService {
  /**
   * Normalize text for hashing: lowercase, collapse whitespace, trim.
   */
  normalize(text: string): string {
    return text.toLowerCase().replace(/\s+/g, " ").trim();
  }

  /**
   * Compute SHA-256 hash of normalized text content.
   * Returns null if text is empty or undefined.
   */
  hash(text: string | undefined | null): string | null {
    if (!text || text.trim().length === 0) {
      return null;
    }
    const normalized = this.normalize(text);
    return createHash("sha256").update(normalized).digest("hex");
  }
}
