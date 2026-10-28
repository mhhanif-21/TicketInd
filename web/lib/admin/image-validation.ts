export const EVENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const EVENT_IMAGE_MAX_DIMENSION = 8_192;
export const EVENT_IMAGE_MAX_PIXELS = 20_000_000;
export const EVENT_MEDIA_MAX_ITEMS = 5;

const SUPPORTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const SUPPORTED_EXTENSIONS = /\.(jpe?g|png|webp)$/i;

function isSupportedFile(file: File): boolean {
  return SUPPORTED_MIME_TYPES.has(file.type) || SUPPORTED_EXTENSIONS.test(file.name);
}

async function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      image.onerror = () => reject(new Error('invalid_image'));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function validateEventImageFile(file: File): Promise<string | null> {
  if (!isSupportedFile(file)) {
    return `${file.name || 'File'} must be a JPG, PNG, or WebP image.`;
  }

  if (file.size <= 0) {
    return `${file.name || 'File'} is empty.`;
  }

  if (file.size > EVENT_IMAGE_MAX_BYTES) {
    const megabytes = (file.size / (1024 * 1024)).toFixed(1);
    return `${file.name || 'File'} is ${megabytes} MB. The maximum is 5 MB.`;
  }

  let dimensions: { width: number; height: number };
  try {
    dimensions = await readImageDimensions(file);
  } catch {
    return `${file.name || 'File'} is not a valid image.`;
  }

  if (
    dimensions.width > EVENT_IMAGE_MAX_DIMENSION
    || dimensions.height > EVENT_IMAGE_MAX_DIMENSION
    || dimensions.width * dimensions.height > EVENT_IMAGE_MAX_PIXELS
  ) {
    return `${file.name || 'File'} is too large. Use at most 8192 px per side and 20 megapixels.`;
  }

  return null;
}
