import { createRequire } from "node:module"
import { Command } from "commander"
import fs from "fs/promises"
import path from "path"
import chalk from "chalk"
import ora from "ora"
import { isSupportedImage, determineOutputPath, logOutputPath } from "./helpers.js"
import { processDirectory, processZip, processSingleFile } from "./processors.js"

const require = createRequire(import.meta.url)
const { version } = require("../package.json")

export async function main() {
  const program = new Command()

  program
    .name("image-optimizer")
    .description(
      chalk.cyan(
        "🚀 Universal CLI to optimize images (File, Folder, or Zip). Supports JPG, PNG, WebP, AVIF, GIF, TIFF, SVG.",
      ),
    )
    .version(version)
    .requiredOption("-s, --source <path>", "Path to the input file, folder, or zip")
    .option("-o, --output <path>", "Path to the output (default: source location + -optimized)")
    .option("-q, --quality <number>", "Quality of compression (1-100)", "80")
    .option("-w, --width <number>", "Max width to resize images to", "1600")
    .parse(process.argv)

  const options = program.opts()
  const spinner = ora("Analyzing source...").start()

  try {
    const sourcePath = path.resolve(process.cwd(), options.source)

    try {
      await fs.access(sourcePath)
    } catch {
      spinner.fail(`Source not found: ${sourcePath}`)
      process.exit(1)
    }

    const stats = await fs.stat(sourcePath)
    const quality = parseInt(options.quality)
    const width = parseInt(options.width)

    if (quality < 1 || quality > 100) {
      spinner.fail("Quality must be between 1 and 100")
      process.exit(1)
    }
    if (width < 1) {
      spinner.fail("Width must be a positive number")
      process.exit(1)
    }

    const config = { quality, width, spinner }

    if (stats.isDirectory()) {
      const outputPath = determineOutputPath(sourcePath, options.output, "-optimized")
      spinner.text = "Processing Directory..."
      await processDirectory(sourcePath, outputPath, config)
      logOutputPath(outputPath)
    } else if (sourcePath.toLowerCase().endsWith(".zip")) {
      const outputPath = determineOutputPath(sourcePath, options.output, "-optimized.zip")
      spinner.text = "Processing Zip..."
      await processZip(sourcePath, outputPath, config)
      logOutputPath(outputPath)
    } else if (isSupportedImage(sourcePath)) {
      const ext = path.extname(sourcePath)
      const outputPath = determineOutputPath(sourcePath, options.output, `-optimized${ext}`)
      spinner.text = "Processing Single File..."
      await processSingleFile(sourcePath, outputPath, config)
      logOutputPath(outputPath)
    } else {
      spinner.fail("Unsupported file type. Please provide a Folder, Zip, or supported Image.")
      process.exit(1)
    }

    spinner.succeed(chalk.green("Optimization Complete!"))
  } catch (error: any) {
    spinner.fail("Error occurred")
    console.error(chalk.red(error.message))
    process.exit(1)
  }
}
