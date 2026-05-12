import sharp from "sharp"
import { isSvgExtension } from "./constants.js"

export interface OptimizerConfig {
  quality: number
  width: number
  spinner: { text: string }
}

export async function optimizeBuffer(
  buffer: Buffer,
  ext: string,
  config: OptimizerConfig,
): Promise<Buffer> {
  const extension = ext.toLowerCase()

  if (isSvgExtension(extension)) {
    return buffer
  }

  try {
    let pipeline = sharp(buffer, { animated: true })
    const metadata = await pipeline.metadata()

    if (metadata.width && metadata.width > config.width) {
      pipeline = pipeline.resize({ width: config.width })
    }

    switch (extension) {
      case ".jpeg":
      case ".jpg":
      case ".jfif":
        pipeline = pipeline.jpeg({ quality: config.quality, mozjpeg: true })
        break
      case ".png":
        pipeline = pipeline.png({
          quality: config.quality,
          compressionLevel: 9,
          palette: true,
        })
        break
      case ".webp":
        pipeline = pipeline.webp({ quality: config.quality })
        break
      case ".gif":
        pipeline = pipeline.gif({
          colors: Math.max(2, Math.round((config.quality / 100) * 256)),
        })
        break
      case ".avif":
        pipeline = pipeline.avif({ quality: config.quality })
        break
      case ".tiff":
        pipeline = pipeline.tiff({ quality: config.quality })
        break
      default:
        return buffer
    }

    const outputBuffer = await pipeline.toBuffer()

    if (outputBuffer.length >= buffer.length) {
      return buffer
    }

    return outputBuffer
  } catch {
    return buffer
  }
}
