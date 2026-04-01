import sharp from "sharp"

export async function optimizeBuffer(buffer: Buffer, ext: string, config: any): Promise<Buffer> {
  const extension = ext.toLowerCase()

  try {
    let pipeline = sharp(buffer, { animated: true })
    const metadata = await pipeline.metadata()

    if (metadata.width && metadata.width > config.width) {
      pipeline = pipeline.resize({ width: config.width })
    }

    switch (extension) {
      case ".svg":
        return buffer
      case ".jpeg":
      case ".jpg":
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
        pipeline = pipeline.gif({ colors: 128 })
        break
      case ".avif":
        pipeline = pipeline.avif({ quality: config.quality })
        break
      case ".tiff":
        pipeline = pipeline.tiff({ quality: config.quality })
        break
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
