"use client";

/**
 * Downscales + compresses an image client-side before it ever leaves the
 * device (section 47) — both to keep uploads fast on a phone connection
 * and because Gemini needs far less than a 12 MP original to read a plate
 * of food or a nutrition label.
 */
export async function compressImageToBase64(
  file: File,
  maxDimension = 1280,
  quality = 0.82,
): Promise<{ data: string; mimeType: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unsupported");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("compression_failed"))), "image/jpeg", quality),
  );

  const base64 = await blobToBase64(blob);
  return { data: base64, mimeType: "image/jpeg" };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
