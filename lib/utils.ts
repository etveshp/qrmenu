import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Downscale + re-encode a raster image so bucket uploads stay small.
 * Vector (SVG), animated (GIF) and non-image files are returned unchanged.
 * The original file is also returned when the re-encode wouldn't actually
 * shrink it (already small enough or the compressed blob is larger).
 */
export async function compressImage(
  file: File,
  opts: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<File> {
  const { maxWidth = 1024, maxHeight = 1024, quality = 0.85 } = opts;
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file;
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Failed to load image'));
      el.src = url;
    });
    if (!img.naturalWidth || !img.naturalHeight) return file;

    // Only downscale — never upscale a small image.
    const scale = Math.min(1, maxWidth / img.naturalWidth, maxHeight / img.naturalHeight);
    if (scale >= 1) return file;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Keep PNG for transparency; everything else becomes JPEG.
    const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name, { type: mime });
  } finally {
    URL.revokeObjectURL(url);
  }
}
