export const OPTIMIZABLE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".jfif",
  ".png",
  ".webp",
  ".gif",
  ".avif",
  ".tiff",
])

export const SUPPORTED_EXTENSIONS = new Set([...OPTIMIZABLE_EXTENSIONS, ".svg"])

export function isSvgExtension(ext: string): boolean {
  return ext === ".svg"
}
