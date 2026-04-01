import fs from "fs/promises"
import path from "path"
import JSZip from "jszip"
import chalk from "chalk"
import { isSupportedImage } from "./helpers.js"
import { optimizeBuffer } from "./optimizer.js"

export async function processDirectory(
  source: string,
  destination: string,
  config: any,
): Promise<number> {
  if (source === destination) {
    destination += "-1"
  }
  await fs.mkdir(destination, { recursive: true })

  const entries = await fs.readdir(source, { withFileTypes: true })

  const dirEntries = entries.filter((e) => e.isDirectory())
  const imageEntries = entries.filter(
    (e) => e.isFile() && isSupportedImage(e.name) && path.extname(e.name).toLowerCase() !== ".svg",
  )
  const nonImageEntries = entries.filter(
    (e) =>
      e.isFile() && (!isSupportedImage(e.name) || path.extname(e.name).toLowerCase() === ".svg"),
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
          return 1
        }
      }),
    )
    processedCount += results.length
  }

  await Promise.all(
    nonImageEntries.map((entry) => {
      return fs.copyFile(path.join(source, entry.name), path.join(destination, entry.name))
    }),
  )

  return processedCount
}

export async function processZip(source: string, destination: string, config: any) {
  const zipData = await fs.readFile(source)
  const zip = await JSZip.loadAsync(zipData)
  const newZip = new JSZip()

  const fileNames = Object.keys(zip.files)
  const imageFiles = fileNames.filter(
    (f) => !zip.files[f].dir && isSupportedImage(f) && path.extname(f).toLowerCase() !== ".svg",
  )
  const totalImages = imageFiles.length
  let imageIndex = 0

  for (const fileName of fileNames) {
    const file = zip.files[fileName]
    if (file.dir) {
      newZip.folder(fileName)
      continue
    }

    const content = await file.async("nodebuffer")
    const ext = path.extname(fileName).toLowerCase()

    if (ext === ".svg") {
      newZip.file(fileName, content)
    } else if (isSupportedImage(fileName)) {
      imageIndex++
      config.spinner.text = `Optimizing in zip [${imageIndex}/${totalImages}]: ${fileName}`
      try {
        const optimized = await optimizeBuffer(content, path.extname(fileName), config)
        newZip.file(fileName, optimized)
      } catch (error: any) {
        console.error(chalk.red(`Failed to optimize ${fileName}: ${error.message}`))
        newZip.file(fileName, content)
      }
    } else {
      newZip.file(fileName, content)
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

export async function processSingleFile(source: string, destination: string, config: any) {
  const buffer = await fs.readFile(source)
  const optimized = await optimizeBuffer(buffer, path.extname(source), config)
  await fs.writeFile(destination, optimized)
}
