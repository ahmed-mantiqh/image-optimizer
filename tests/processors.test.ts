import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { processDirectory, processZip, processSingleFile } from "../src/index.js"
import fs from "fs/promises"
import path from "path"
import os from "os"
import { fileURLToPath } from "url"
import JSZip from "jszip"

vi.mock("../src/optimizer.js", () => ({
  optimizeBuffer: vi.fn(),
}))

import { optimizeBuffer } from "../src/optimizer.js"

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures")
const spinner = { text: "", fail: () => {}, succeed: () => {} }
const config = { quality: 80, width: 1600, spinner }

const tmpDirs: string[] = []

async function makeTmp() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "img-opt-test-"))
  tmpDirs.push(dir)
  return dir
}

beforeEach(() => {
  vi.mocked(optimizeBuffer).mockImplementation(async (buffer) => buffer)
})

afterEach(async () => {
  vi.clearAllMocks()
  await Promise.all(tmpDirs.splice(0).map((d) => fs.rm(d, { recursive: true, force: true })))
})

describe("processSingleFile", () => {
  it("optimizes a file and writes output", async () => {
    const src = path.join(fixturesDir, "tiny.png")
    const tmp = await makeTmp()
    const dest = path.join(tmp, "out.png")
    await processSingleFile(src, dest, config)
    const stat = await fs.stat(dest)
    expect(stat.size).toBeGreaterThan(0)
    expect(optimizeBuffer).toHaveBeenCalled()
  })
})

describe("processDirectory", () => {
  it("optimizes images and copies non-images", async () => {
    const src = await makeTmp()
    const dest = await makeTmp()
    await fs.copyFile(path.join(fixturesDir, "tiny.png"), path.join(src, "img.png"))
    await fs.writeFile(path.join(src, "data.css"), "body{}")
    await processDirectory(src, dest, config)
    expect(await fs.stat(path.join(dest, "img.png"))).toBeTruthy()
    expect(await fs.stat(path.join(dest, "data.css"))).toBeTruthy()
  })

  it("copies SVG unchanged", async () => {
    const src = await makeTmp()
    const dest = await makeTmp()
    const svgContent = "<svg><rect/></svg>"
    await fs.writeFile(path.join(src, "icon.svg"), svgContent)
    await processDirectory(src, dest, config)
    const result = await fs.readFile(path.join(dest, "icon.svg"), "utf8")
    expect(result).toBe(svgContent)
  })

  it("recurses into subdirectories", async () => {
    const src = await makeTmp()
    const dest = await makeTmp()
    const subDir = path.join(src, "sub")
    await fs.mkdir(subDir)
    await fs.copyFile(path.join(fixturesDir, "tiny.jpg"), path.join(subDir, "photo.jpg"))
    await processDirectory(src, dest, config)
    expect(await fs.stat(path.join(dest, "sub", "photo.jpg"))).toBeTruthy()
  })

  it("appends -1 when source equals destination", async () => {
    const src = await makeTmp()
    await fs.copyFile(path.join(fixturesDir, "tiny.png"), path.join(src, "img.png"))
    await processDirectory(src, src, config)
    expect(await fs.stat(path.join(src + "-1", "img.png"))).toBeTruthy()
    tmpDirs.push(src + "-1")
  })

  it("handles empty directory", async () => {
    const src = await makeTmp()
    const dest = await makeTmp()
    const count = await processDirectory(src, dest, config)
    expect(count).toBe(0)
  })

  it("falls back to copying original when optimizeBuffer throws", async () => {
    vi.mocked(optimizeBuffer).mockRejectedValueOnce(new Error("sharp error"))
    const src = await makeTmp()
    const dest = await makeTmp()
    await fs.copyFile(path.join(fixturesDir, "tiny.png"), path.join(src, "img.png"))
    await processDirectory(src, dest, config)
    expect(await fs.stat(path.join(dest, "img.png"))).toBeTruthy()
  })
})

describe("processZip", () => {
  async function makeZip(entries: Record<string, Buffer | string>) {
    const zip = new JSZip()
    for (const [name, content] of Object.entries(entries)) {
      if (content === "__dir__") {
        zip.folder(name)
      } else {
        zip.file(name, content)
      }
    }
    return zip.generateAsync({ type: "nodebuffer" })
  }

  it("optimizes images inside a zip", async () => {
    const pngBuf = await fs.readFile(path.join(fixturesDir, "tiny.png"))
    const src = await makeTmp()
    const dest = await makeTmp()
    const zipPath = path.join(src, "input.zip")
    const outPath = path.join(dest, "output.zip")
    await fs.writeFile(zipPath, await makeZip({ "img.png": pngBuf }))
    await processZip(zipPath, outPath, config)
    const outZip = await JSZip.loadAsync(await fs.readFile(outPath))
    expect(Object.keys(outZip.files)).toContain("img.png")
  })

  it("preserves SVG files unchanged", async () => {
    const svgContent = "<svg><rect/></svg>"
    const src = await makeTmp()
    const dest = await makeTmp()
    const zipPath = path.join(src, "input.zip")
    const outPath = path.join(dest, "output.zip")
    await fs.writeFile(zipPath, await makeZip({ "icon.svg": svgContent }))
    await processZip(zipPath, outPath, config)
    const outZip = await JSZip.loadAsync(await fs.readFile(outPath))
    const content = await outZip.files["icon.svg"].async("string")
    expect(content).toBe(svgContent)
  })

  it("copies non-image files unchanged", async () => {
    const src = await makeTmp()
    const dest = await makeTmp()
    const zipPath = path.join(src, "input.zip")
    const outPath = path.join(dest, "output.zip")
    await fs.writeFile(zipPath, await makeZip({ "style.css": "body{}" }))
    await processZip(zipPath, outPath, config)
    const outZip = await JSZip.loadAsync(await fs.readFile(outPath))
    const content = await outZip.files["style.css"].async("string")
    expect(content).toBe("body{}")
  })

  it("preserves folder entries", async () => {
    const src = await makeTmp()
    const dest = await makeTmp()
    const zipPath = path.join(src, "input.zip")
    const outPath = path.join(dest, "output.zip")
    await fs.writeFile(zipPath, await makeZip({ "assets/": "__dir__", "assets/style.css": "a{}" }))
    await processZip(zipPath, outPath, config)
    const outZip = await JSZip.loadAsync(await fs.readFile(outPath))
    expect(Object.keys(outZip.files).some((f) => f.startsWith("assets"))).toBe(true)
  })

  it("falls back to original when optimizeBuffer throws inside zip", async () => {
    vi.mocked(optimizeBuffer).mockRejectedValueOnce(new Error("sharp error"))
    const pngBuf = await fs.readFile(path.join(fixturesDir, "tiny.png"))
    const src = await makeTmp()
    const dest = await makeTmp()
    const zipPath = path.join(src, "input.zip")
    const outPath = path.join(dest, "output.zip")
    await fs.writeFile(zipPath, await makeZip({ "img.png": pngBuf }))
    await processZip(zipPath, outPath, config)
    const outZip = await JSZip.loadAsync(await fs.readFile(outPath))
    expect(Object.keys(outZip.files)).toContain("img.png")
  })
})
