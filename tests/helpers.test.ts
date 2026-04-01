import { describe, it, expect } from "vitest"
import { isSupportedImage, determineOutputPath } from "../src/index.js"
import path from "path"

describe("isSupportedImage", () => {
  it("returns true for supported extensions", () => {
    expect(isSupportedImage("photo.jpg")).toBe(true)
    expect(isSupportedImage("photo.jpeg")).toBe(true)
    expect(isSupportedImage("photo.png")).toBe(true)
    expect(isSupportedImage("photo.webp")).toBe(true)
    expect(isSupportedImage("photo.gif")).toBe(true)
    expect(isSupportedImage("photo.avif")).toBe(true)
    expect(isSupportedImage("photo.tiff")).toBe(true)
    expect(isSupportedImage("photo.svg")).toBe(true)
  })

  it("returns true regardless of case", () => {
    expect(isSupportedImage("photo.JPG")).toBe(true)
    expect(isSupportedImage("photo.PNG")).toBe(true)
  })

  it("returns false for unsupported extensions", () => {
    expect(isSupportedImage("file.txt")).toBe(false)
    expect(isSupportedImage("file.pdf")).toBe(false)
    expect(isSupportedImage("file")).toBe(false)
  })
})

describe("determineOutputPath", () => {
  it("uses user output when provided", () => {
    const result = determineOutputPath("/src/image.png", "/out/result", "-optimized.png")
    expect(result).toBe(path.resolve(process.cwd(), "/out/result"))
  })

  it("generates output next to source when no user output", () => {
    const result = determineOutputPath("/photos/image.png", undefined, "-optimized.png")
    expect(result).toBe("/photos/image-optimized.png")
  })

  it("handles directory source", () => {
    const result = determineOutputPath("/photos/mydir", undefined, "-optimized")
    expect(result).toBe("/photos/mydir-optimized")
  })
})
