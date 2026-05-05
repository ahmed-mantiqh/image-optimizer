import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const spinner = {
  start: vi.fn().mockReturnThis(),
  fail: vi.fn().mockReturnThis(),
  succeed: vi.fn().mockReturnThis(),
  text: "",
}

vi.mock("ora", () => ({ default: () => spinner }))
vi.mock("../src/processors.js", () => ({
  processDirectory: vi.fn().mockResolvedValue(1),
  processZip: vi.fn().mockResolvedValue(undefined),
  processSingleFile: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("../src/helpers.js", () => ({
  isSupportedImage: vi.fn(),
  determineOutputPath: vi.fn().mockReturnValue("/out/result"),
  logOutputPath: vi.fn(),
}))

import { main } from "../src/cli.js"
import { processDirectory, processZip, processSingleFile } from "../src/processors.js"
import { isSupportedImage } from "../src/helpers.js"
import fs from "fs/promises"

const mockAccess = vi.spyOn(fs, "access")
const mockStat = vi.spyOn(fs, "stat")
const mockExit = vi.spyOn(process, "exit").mockImplementation((() => {}) as never)

function setArgv(args: string[]) {
  process.argv = ["node", "index.js", ...args]
}

function makeStatResult(isDir: boolean, isFile = !isDir) {
  return { isDirectory: () => isDir, isFile: () => isFile } as any
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAccess.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("main() — validation", () => {
  it("exits when source not found", async () => {
    setArgv(["-s", "/no/such/file.png"])
    mockAccess.mockRejectedValue(new Error("ENOENT"))
    await main()
    expect(mockExit).toHaveBeenCalledWith(1)
  })

  it("exits when quality < 1", async () => {
    setArgv(["-s", "/img.png", "-q", "0"])
    mockStat.mockResolvedValue(makeStatResult(false))
    await main()
    expect(mockExit).toHaveBeenCalledWith(1)
    expect(spinner.fail).toHaveBeenCalledWith("Quality must be between 1 and 100")
  })

  it("exits when quality > 100", async () => {
    setArgv(["-s", "/img.png", "-q", "101"])
    mockStat.mockResolvedValue(makeStatResult(false))
    await main()
    expect(mockExit).toHaveBeenCalledWith(1)
    expect(spinner.fail).toHaveBeenCalledWith("Quality must be between 1 and 100")
  })

  it("exits when width < 1", async () => {
    setArgv(["-s", "/img.png", "-w", "0"])
    mockStat.mockResolvedValue(makeStatResult(false))
    await main()
    expect(mockExit).toHaveBeenCalledWith(1)
    expect(spinner.fail).toHaveBeenCalledWith("Width must be a positive number")
  })
})

describe("main() — dispatch", () => {
  it("calls processDirectory for a directory source", async () => {
    setArgv(["-s", "/some/dir"])
    mockStat.mockResolvedValue(makeStatResult(true))
    await main()
    expect(processDirectory).toHaveBeenCalled()
  })

  it("calls processZip for a .zip source", async () => {
    setArgv(["-s", "/archive.zip"])
    mockStat.mockResolvedValue(makeStatResult(false))
    await main()
    expect(processZip).toHaveBeenCalled()
  })

  it("calls processZip for a .ZIP source (case-insensitive)", async () => {
    setArgv(["-s", "/archive.ZIP"])
    mockStat.mockResolvedValue(makeStatResult(false))
    await main()
    expect(processZip).toHaveBeenCalled()
  })

  it("calls processSingleFile for a supported image", async () => {
    setArgv(["-s", "/photo.png"])
    mockStat.mockResolvedValue(makeStatResult(false))
    vi.mocked(isSupportedImage).mockReturnValue(true)
    await main()
    expect(processSingleFile).toHaveBeenCalled()
  })

  it("exits for unsupported file type", async () => {
    setArgv(["-s", "/doc.pdf"])
    mockStat.mockResolvedValue(makeStatResult(false))
    vi.mocked(isSupportedImage).mockReturnValue(false)
    await main()
    expect(mockExit).toHaveBeenCalledWith(1)
  })

  it("respects custom -o output path", async () => {
    setArgv(["-s", "/photo.png", "-o", "/custom/out.png"])
    mockStat.mockResolvedValue(makeStatResult(false))
    vi.mocked(isSupportedImage).mockReturnValue(true)
    await main()
    expect(processSingleFile).toHaveBeenCalled()
  })
})

describe("main() — error handling", () => {
  it("catches processor errors and exits", async () => {
    setArgv(["-s", "/some/dir"])
    mockStat.mockResolvedValue(makeStatResult(true))
    vi.mocked(processDirectory).mockRejectedValue(new Error("disk full"))
    await main()
    expect(mockExit).toHaveBeenCalledWith(1)
    expect(spinner.fail).toHaveBeenCalledWith("Error occurred")
  })
})
