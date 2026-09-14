import { randomBytes } from "node:crypto";

import { customAlphabet } from "nanoid";

/**
 * All identifiers that appear in URLs or QR codes. Every generator uses a
 * cryptographically secure source (nanoid's customAlphabet / crypto.randomBytes).
 */

const LOWER_ALNUM = "0123456789abcdefghijklmnopqrstuvwxyz";
const URL_SAFE = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";

/** Crockford base32: no I, L, O, U so codes are unambiguous when read aloud or typed. */
export const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const makeSlug = customAlphabet(LOWER_ALNUM, 10);
const makeGuestToken = customAlphabet(URL_SAFE, 16);
const makeScannerToken = customAlphabet(URL_SAFE, 24);
const makeShortCode = customAlphabet(CROCKFORD, 6);

/** Public event link segment: /e/<slug>. */
export function slug(): string {
  return makeSlug();
}

/** Personal invitation link segment: /i/<token>. */
export function guestToken(): string {
  return makeGuestToken();
}

/** Staff scanner link segment: /scan/<token>. */
export function scannerToken(): string {
  return makeScannerToken();
}

/** QR payload token (128 bits, base64url, 22 chars): /q/<token>. */
export function qrToken(): string {
  return randomBytes(16).toString("base64url");
}

/** Manual-entry code shown under the QR, unique per event. */
export function shortCode(): string {
  return makeShortCode();
}

/**
 * Normalizes user-typed short codes: strips separators/whitespace, uppercases,
 * and maps the letters Crockford treats as confusable (I/L -> 1, O -> 0).
 */
export function normalizeShortCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0");
}

export function formatShortCode(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}

export const QR_TOKEN_RE = /^[A-Za-z0-9_-]{22}$/;
export const SHORT_CODE_RE = /^[0-9A-HJKMNP-TV-Z]{6}$/;
export const GUEST_TOKEN_RE = /^[A-Za-z0-9_-]{16}$/;
export const SCANNER_TOKEN_RE = /^[A-Za-z0-9_-]{24}$/;
export const SLUG_RE = /^[a-z0-9]{10}$/;
