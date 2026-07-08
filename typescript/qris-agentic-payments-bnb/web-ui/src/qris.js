// QRIS (Quick Response Code Indonesian Standard) parser for the browser.
// Mirrors the logic from src/qris.ts but as a pure-browser module.

// CRC16-CCITT (0x1021, init 0xFFFF) — same as the EMV QR spec.
// Matches crc16Ccitt() in src/qris.ts exactly.
export function crc16CCITT(data) {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// Build a QRIS string from an ordered tag map — mirrors buildQris() in src/qris.ts.
// Tags MUST be in ascending order. Length is 2-digit zero-padded.
function buildQris(fields) {
  const tags = Object.keys(fields).sort();
  let body = "";
  for (const tag of tags) {
    const val = fields[tag];
    body += tag + val.length.toString().padStart(2, "0") + val;
  }
  // CRC is computed over body + "63040000" (the tag+length+placeholder),
  // then the real CRC replaces the placeholder.
  const crc = crc16CCITT(body + "63040000");
  return body + "6304" + crc;
}

// Parse QRIS payload into tag map.
export function parseQRIS(raw) {
  const tags = {};
  let pos = 0;
  let crcValid = false;

  while (pos < raw.length) {
    const tag = raw.substring(pos, pos + 2);
    pos += 2;
    if (pos + 2 > raw.length) break;
    const len = parseInt(raw.substring(pos, pos + 2), 10);
    if (isNaN(len) || len <= 0 || pos + 2 + len > raw.length) {
      break;
    }
    pos += 2;
    const value = raw.substring(pos, pos + len);
    pos += len;
    tags[tag] = value;
  }

  // Check CRC: tag 63 should be last and match computed CRC.
  if (tags["63"]) {
    const crcTag = raw.lastIndexOf("6304");
    if (crcTag !== -1) {
      // CRC is computed over everything up to and including "63040000"
      // (the 4 zeros are the placeholder for the actual CRC value).
      const dataBefore = raw.substring(0, crcTag + 4) + "0000";
      const expected = crc16CCITT(dataBefore);
      crcValid = expected === tags["63"];
    }
  }

  return { tags, crcValid };
}

// Build a demo QRIS string for a given merchant + amount.
// Uses the same field structure as test/agent.test.ts VALID_QRIS.
export function buildDemoQRIS(amountIDR, merchantName) {
  // Pad merchant name to exactly 25 chars (matching test format)
  // or use as-is if shorter (QRIS allows up to 25).
  const name = merchantName.substring(0, 25);
  const fields = {
    "00": "01", // Payload format indicator
    "01": "12", // Point-of-initiation method: 12 = dynamic
    26: "610014ID.CO.QRIS.WWW01189360091234567890120303UMI51440014ID.CO.QRIS.WWW0215ID10243012345670303UMI",
    52: "5812", // MCC: eating places
    53: "360", // Currency: IDR (ISO 4217)
    54: String(amountIDR), // Transaction amount
    58: "ID", // Country code
    59: name, // Merchant name
    60: "JAKARTA", // Merchant city
    61: "12345", // Postal code
  };
  return buildQris(fields);
}
