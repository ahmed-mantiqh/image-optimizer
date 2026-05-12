import fs from "fs/promises"
import path from "path"
import JSZip from "jszip"
import chalk from "chalk"
import { optimizeBuffer } from "./optimizer.js"
import { OPTIMIZABLE_EXTENSIONS } from "./constants.js"
import type { OptimizerConfig } from "./optimizer.js"

export async function processDirectory(
  source: string,
  destination: string,
  config: OptimizerConfig,
): Promise<number> {
  if (source === destination) {
    destination += "-1"
  }
  await fs.mkdir(destination, { recursive: true })

  const entries = await fs.readdir(source, { withFileTypes: true })

  const dirEntries = entries.filter((e) => e.isDirectory())
  const imageEntries = entries.filter(
    (e) =>
      e.isFile() &&
      OPTIMIZABLE_EXTENSIONS.has(path.extname(e.name).toLowerCase()),
  )
  const nonImageEntries = entries.filter(
    (e) => e.isFile() && !OPTIMIZABLE_EXTENSIONS.has(path.extname(e.name).toLowerCase()),
  )

  for (const entry of dirEntries) {
    await processDirectory(
      path.join(source, entry.name),
      path.join(destination, entry.name),
      config,
    )
  }

  let processedCount = 0
  const batchSize = 5
  const totalImages = imageEntries.length

  for (let i = 0; i < imageEntries.length; i += batchSize) {
    const batch = imageEntries.slice(i, Math.min(i + batchSize, imageEntries.length))
    const results = await Promise.all(
      batch.map(async (entry, j) => {
        const srcPath = path.join(source, entry.name)
        const destPath = path.join(destination, entry.name)
        const num = i + j + 1
        config.spinner.text = `Optimizing [${num}/${totalImages}]: ${entry.name}`
        try {
          const buffer = await fs.readFile(srcPath)
          const optimizedBuffer = await optimizeBuffer(buffer, path.extname(entry.name), config)
          await fs.writeFile(destPath, optimizedBuffer)
          return 1
        } catch (error: any) {
          console.error(chalk.red(`Failed to optimize ${entry.name}: ${error.message}`))
          await fs.copyFile(srcPath, destPath)
          return 0
        }
      }),
    )
    processedCount += results.reduce((sum: number, r) => sum + r, 0)
  }

  await Promise.all(
    nonImageEntries.map((entry) => {
      return fs.copyFile(path.join(source, entry.name), path.join(destination, entry.name))
    }),
  )

  return processedCount
}

export async function processZip(
  source: string,
  destination: string,
  config: OptimizerConfig,
) {
  const zipData = await fs.readFile(source)
  const zip = await JSZip.loadAsync(zipData)
  const newZip = new JSZip()

  const fileNames = Object.keys(zip.files)
  const imageEntries: { name: string; content: Buffer }[] = []
  const totalImages = fileNames.filter(
    (f) => !zip.files[f].dir && OPTIMIZABLE_EXTENSIONS.has(path.extname(f).toLowerCase()),
  ).length

  // First pass: collect all entries, process non-image entries immediately
  for (const fileName of fileNames) {
    const file = zip.files[fileName]
    if (file.dir) {
      newZip.folder(fileName)
      continue
    }

    const ext = path.extname(fileName).toLowerCase()
    const content = await file.async("nodebuffer")

    if (OPTIMIZABLE_EXTENSIONS.has(ext)) {
      imageEntries.push({ name: fileName, content })
    } else {
      newZip.file(fileName, content)
    }
  }

  // Batch process image entries
  const batchSize = 5
  for (let i = 0; i < imageEntries.length; i += batchSize) {
    const batch = imageEntries.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map(async (entry, j) => {
        const num = i + j + 1
        config.spinner.text = `Optimizing in zip [${num}/${totalImages}]: ${entry.name}`
        try {
          const optimized = await optimizeBuffer(
            entry.content,
            path.extname(entry.name),
            config,
          )
          return { name: entry.name, buffer: optimized }
        } catch (error: any) {
          console.error(
            chalk.red(`Failed to optimize ${entry.name}: ${error.message}`),
          )
          return { name: entry.name, buffer: entry.content }
        }
      }),
    )
    for (const { name, buffer } of results) {
      newZip.file(name, buffer)
    }
  }

  config.spinner.text = "Generating Output Zip..."
  const outputBuffer = await newZip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  })
  await fs.writeFile(destination, outputBuffer)
}

export async function processSingleFile(
  source: string,
  destination: string,
  config: OptimizerConfig,
) {
  const buffer = await fs.readFile(source)
  const optimized = await optimizeBuffer(buffer, path.extname(source), config)
  await fs.writeFile(destination, optimized)
}
