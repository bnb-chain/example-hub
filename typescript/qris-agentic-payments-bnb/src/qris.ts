/**
 * QRIS (Quick Response Code Indonesian Standard) parser.
 *
 * QRIS follows the EMVCo Merchant-Presented Mode (MPM) spec: a flat string of
 * Tag-Length-Value (TLV) fields. Some top-level tags (26-51 merchant account
 * info, 62 additional data) nest their own TLV. The last field (63) is a
 * CRC16-CCITT (poly 0x1021, init 0xFFFF, no reflect, no xor-out) over the
 * entire payload with the CRC value zeroed.
 *
 * This module is pure TypeScript with zero dependencies so it runs anywhere
 * (Node, browser, edge) — the agent can parse a scanned code offline.
 */

export interface NestedField {
  tag: string;
  value: string;
}

export interface QrisData {
  /** Tag 00 — usually "01". */
  payloadFormatIndicator: string;
  /** Tag 01 — "11" static, "12" dynamic. */
  pointOfInitiation: string;
  /** Tags 26-51 — merchant account info templates (each is nested TLV). */
  merchantAccountInfo: NestedField[];
  /** Tag 52 — ISO 18245 merchant category code. */
  merchantCategoryCode?: string;
  /** Tag 53 — ISO 4217 numeric currency. "360" = IDR. */
  currency?: string;
  /** Tag 54 — amount. Present only on dynamic QRIS. */
  amount?: string;
  /** Tag 58 — country code, e.g. "ID". */
  countryCode?: string;
  /** Tag 59 — merchant name. */
  merchantName?: string;
  /** Tag 60 — merchant city. */
  merchantCity?: string;
  /** Tag 61 — merchant region. */
  merchantRegion?: string;
  /** Tag 62 — additional data (nested). */
  additionalData: NestedField[];
  /** Tag 63 — CRC value as printed in the code. */
  crc: string;
  /** True when the computed CRC matches `crc`. */
  crcValid: boolean;
  /** Best-effort merchant identifier pulled from merchant-account-info tag 01/02. */
  merchantId?: string;
}

/** CRC16-CCITT (0x1021, init 0xFFFF, no reflect, no xor-out). */
export function crc16Ccitt(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function parseNested(value: string): NestedField[] {
  const out: NestedField[] = [];
  let i = 0;
  while (i + 4 <= value.length) {
    const tag = value.slice(i, i + 2);
    const len = parseInt(value.slice(i + 2, i + 4), 10);
    if (Number.isNaN(len)) break;
    const val = value.slice(i + 4, i + 4 + len);
    out.push({ tag, value: val });
    i += 4 + len;
  }
  return out;
}

/**
 * Parse a QRIS string into structured fields and validate its CRC.
 * @throws if the payload has no CRC field (tag 63).
 */
export function parseQris(payload: string): QrisData {
  // SEC-06 FIX: Use lastIndexOf instead of indexOf — the CRC tag (63) is
  // always the final field, so searching from the end avoids false matches
  // when "6304" appears inside merchant account info (tag 26-51) or
  // additional data (tag 62) field values.
  const crcStart = payload.lastIndexOf("6304");
  if (crcStart < 0) {
    throw new Error("QRIS: missing CRC field (tag 63)");
  }
  const crcValue = payload.slice(crcStart + 4, crcStart + 8);
  // CRC is computed over the whole payload with the CRC value set to "0000".
  const crcInput = payload.slice(0, crcStart) + "63040000";
  const crcValid = crc16Ccitt(crcInput) === crcValue.toUpperCase();

  const fields: Record<string, string> = {};
  const merchantAccountInfo: NestedField[] = [];
  let additionalData: NestedField[] = [];
  let i = 0;
  while (i < crcStart) {
    const tag = payload.slice(i, i + 2);
    const len = parseInt(payload.slice(i + 2, i + 4), 10);
    if (Number.isNaN(len)) break;
    const val = payload.slice(i + 4, i + 4 + len);
    fields[tag] = val;
    if (tag >= "26" && tag <= "51")
      merchantAccountInfo.push(...parseNested(val));
    if (tag === "62") additionalData = parseNested(val);
    i += 4 + len;
  }

  const firstMai = merchantAccountInfo.find(
    (f) => f.tag === "01" || f.tag === "02"
  );
  const data: QrisData = {
    payloadFormatIndicator: fields["00"] ?? "",
    pointOfInitiation: fields["01"] ?? "",
    merchantAccountInfo,
    merchantCategoryCode: fields["52"],
    currency: fields["53"],
    amount: fields["54"],
    countryCode: fields["58"],
    merchantName: fields["59"],
    merchantCity: fields["60"],
    merchantRegion: fields["61"],
    additionalData,
    crc: crcValue,
    crcValid,
    merchantId: firstMai?.value,
  };
  return data;
}

/**
 * Convenience: parse + assert it is a valid, IDR, dynamic (amount-present) QRIS.
 * @returns the parsed data (typed-narrowed).
 * @throws if CRC invalid, currency is not IDR, or no amount is present.
 */
export function parsePaymentQris(payload: string): QrisData {
  const q = parseQris(payload);
  if (!q.crcValid)
    throw new Error(
      "QRIS: CRC validation failed — code may be tampered or truncated"
    );
  if (q.currency !== "360") {
    throw new Error(
      `QRIS: unsupported currency "${q.currency}" (only IDR/360 supported)`
    );
  }
  if (!q.amount) {
    throw new Error(
      "QRIS: static code has no amount — a dynamic QRIS with tag 54 is required to pay"
    );
  }
  return q;
}

/**
 * Build a QRIS string from a flat map of tag -> value (top-level fields only;
 * nested merchant-account-info / additional-data must be pre-serialized). The
 * CRC16-CCITT (tag 63) is computed and appended automatically, so the output
 * always passes `parsePaymentQris`.
 */
export function buildQris(fields: Record<string, string>): string {
  let body = "";
  for (const [tag, val] of Object.entries(fields)) {
    body += tag + val.length.toString().padStart(2, "0") + val;
  }
  const crc = crc16Ccitt(body + "63040000");
  return body + "6304" + crc;
}
