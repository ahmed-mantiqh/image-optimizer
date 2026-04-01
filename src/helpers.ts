import path from "path"
import chalk from "chalk"
import { SUPPORTED_EXTENSIONS } from "./constants.js"

export function logOutputPath(outputPath: string): void {
  console.log(`\n📁 Output: ${chalk.cyan(outputPath)}`)
}

export function isSupportedImage(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return SUPPORTED_EXTENSIONS.has(ext)
}

export function determineOutputPath(
  source: string,
  userOutput: string | undefined,
  suffix: string,
): string {
  if (userOutput) {
    return path.resolve(process.cwd(), userOutput)
  }

  const dir = path.dirname(source)
  const ext = path.extname(source)
  const name = path.basename(source, ext)

  return path.join(dir, `${name}${suffix}`)
}
