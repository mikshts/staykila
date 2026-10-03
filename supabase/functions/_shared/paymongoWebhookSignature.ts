export async function verifyPayMongoWebhookSignature(
  rawBody: string,
  secret: string,
  signatureHeader: string,
): Promise<boolean> {
  if (!secret || !signatureHeader) return false;

  const fields = signatureHeader.split(",").map((field) => field.trim());
  const timestamp = fields
    .find((field) => field.startsWith("t="))
    ?.slice(2);
  const signatures = fields
    .filter((field) => field.startsWith("te=") || field.startsWith("li="))
    .map((field) => field.slice(3))
    .filter((signature) => /^[0-9a-f]{64}$/i.test(signature));

  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) {
    return false;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${timestamp}.${rawBody}`),
  );
  const expected = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  let matched = 0;
  for (const signature of signatures) {
    let difference = 0;
    for (let index = 0; index < expected.length; index += 1) {
      difference |= expected.charCodeAt(index) ^ signature.toLowerCase().charCodeAt(index);
    }
    matched |= Number(difference === 0);
  }

  return matched === 1;
}