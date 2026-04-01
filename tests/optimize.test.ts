import { describe, it, expect } from "vitest"
import { optimizeBuffer } from "../src/index.js"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures")

describe("optimizeBuffer", () => {
  it("optimizes a PNG", async () => {
    const input = await fs.readFile(path.join(fixturesDir, "tiny.png"))
    const config = { quality: 80, width: 1600, spinner: { text: "" } }
    const result = await optimizeBuffer(input, ".png", config)
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it("optimizes a JPEG", async () => {
    const input = await fs.readFile(path.join(fixturesDir, "tiny.jpg"))
    const config = { quality: 80, width: 1600, spinner: { text: "" } }
    const result = await optimizeBuffer(input, ".jpg", config)
    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it("returns original for SVG", async () => {
    const input = Buffer.from("<svg></svg>")
    const config = { quality: 80, width: 1600, spinner: { text: "" } }
    const result = await optimizeBuffer(input, ".svg", config)
    expect(result).toBe(input)
  })

  it("returns original buffer on error", async () => {
    const input = Buffer.from("not an image")
    const config = { quality: 80, width: 1600, spinner: { text: "" } }
    const result = await optimizeBuffer(input, ".png", config)
    expect(result).toBe(input)
  })

  it("resizes when image exceeds max width", async () => {
    const wideImage = await (
      await import("sharp")
    )
      .default({
        create: {
          width: 3000,
          height: 100,
          channels: 3,
          background: { r: 0, g: 0, b: 0 },
        },
      })
      .png()
      .toBuffer()

    const config = { quality: 80, width: 100, spinner: { text: "" } }
    const result = await optimizeBuffer(wideImage, ".png", config)
    const metadata = await (await import("sharp")).default(result).metadata()
    expect(metadata.width).toBe(100)
  })
})
