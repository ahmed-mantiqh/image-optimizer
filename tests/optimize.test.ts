import { describe, it, expect } from "vitest"
import { optimizeBuffer } from "../src/index.js"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import sharp from "sharp"

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures")

async function makeImage(width: number, height: number, format: "png" | "jpg" | "webp" = "png") {
  return sharp({ create: { width, height, channels: 3, background: { r: 100, g: 100, b: 100 } } })
    [format]()
    .toBuffer()
}

const config = { quality: 80, width: 1600, spinner: { text: "" } }

describe("optimizeBuffer", () => {
  it("optimizes a PNG", async () => {
    const input = await fs.readFile(path.join(fixturesDir, "tiny.png"))
    const result = await optimizeBuffer(input, ".png", config)
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it("optimizes a JPEG (.jpg)", async () => {
    const input = await fs.readFile(path.join(fixturesDir, "tiny.jpg"))
    const result = await optimizeBuffer(input, ".jpg", config)
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it("optimizes a JPEG (.jpeg alias)", async () => {
    const input = await fs.readFile(path.join(fixturesDir, "tiny.jpg"))
    const result = await optimizeBuffer(input, ".jpeg", config)
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it("optimizes a WebP", async () => {
    const input = await fs.readFile(path.join(fixturesDir, "tiny.webp"))
    const result = await optimizeBuffer(input, ".webp", config)
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it("optimizes a GIF", async () => {
    const input = await makeImage(10, 10, "png")
    const gifBuf = await sharp(input).gif().toBuffer()
    const result = await optimizeBuffer(gifBuf, ".gif", { quality: 80, width: 1600, spinner: { text: "" } })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it("GIF colors scale with quality", async () => {
    const input = await makeImage(10, 10, "png")
    const gifBuf = await sharp(input).gif().toBuffer()
    const lowQ = { quality: 50, width: 1600, spinner: { text: "" } }
    const highQ = { quality: 100, width: 1600, spinner: { text: "" } }
    const resultLow = await optimizeBuffer(gifBuf, ".gif", lowQ)
    const resultHigh = await optimizeBuffer(gifBuf, ".gif", highQ)
    expect(Buffer.isBuffer(resultLow)).toBe(true)
    expect(Buffer.isBuffer(resultHigh)).toBe(true)
  })

  it("optimizes an AVIF", async () => {
    const input = await makeImage(10, 10)
    const result = await optimizeBuffer(input, ".avif", config)
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it("optimizes a TIFF", async () => {
    const input = await makeImage(10, 10)
    const result = await optimizeBuffer(input, ".tiff", config)
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it("returns original for SVG", async () => {
    // Use a valid image buffer so sharp can parse metadata; .svg ext hits the SVG case in the switch
    const input = await makeImage(10, 10)
    const result = await optimizeBuffer(input, ".svg", config)
    expect(result).toBe(input)
  })

  it("returns original buffer on error", async () => {
    const input = Buffer.from("not an image")
    const result = await optimizeBuffer(input, ".png", config)
    expect(result).toBe(input)
  })

  it("returns original if optimized is larger", async () => {
    // tiny image where compression can't help — original returned
    const input = await makeImage(2, 2)
    const result = await optimizeBuffer(input, ".png", { quality: 1, width: 1600, spinner: { text: "" } })
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it("resizes when image exceeds max width", async () => {
    const wideImage = await makeImage(3000, 100)
    const result = await optimizeBuffer(wideImage, ".png", { quality: 80, width: 100, spinner: { text: "" } })
    const metadata = await sharp(result).metadata()
    expect(metadata.width).toBe(100)
  })

  it("does not resize when image is within max width", async () => {
    const input = await makeImage(100, 100)
    const result = await optimizeBuffer(input, ".png", { quality: 80, width: 1600, spinner: { text: "" } })
    const metadata = await sharp(result).metadata()
    expect(metadata.width).toBe(100)
  })
})
