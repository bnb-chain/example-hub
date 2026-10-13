// Reproduce the EXACT colliding pair the audit test references
function receiptId(txHash: string, timestamp: number): string {
  let h = 0;
  const s = txHash + timestamp.toString();
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return "rcpt_" + Math.abs(h).toString(16).padStart(8, "0");
}

const seen = new Map<string, string>();
let collision: [string, string] | null = null;
const N = 1_000_000;
for (let i = 0; i < N; i++) {
  const tx = "0x" + i.toString(16).padStart(64, "0");
  const ts = 1700000000 + (i % 1000);
  const id = receiptId(tx, ts);
  const key = tx + "|" + ts;
  const prev = seen.get(id);
  if (prev !== undefined && prev !== key) {
    collision = [prev, key];
    break;
  }
  seen.set(id, key);
}
if (collision) {
  const [a, b] = collision;
  const [txA, tsAStr] = a.split("|");
  const [txB, tsBStr] = b.split("|");
  const tsA = parseInt(tsAStr!, 10);
  const tsB = parseInt(tsBStr!, 10);
  console.log("txA=", txA);
  console.log("tsA=", tsA);
  console.log("txB=", txB);
  console.log("tsB=", tsB);
  console.log("idA=", receiptId(txA!, tsA));
  console.log("idB=", receiptId(txB!, tsB));
  console.log("match=", receiptId(txA!, tsA) === receiptId(txB!, tsB));
} else {
  console.log("no collision found in", N, "iterations");
}
