#!/usr/bin/env node
export { optimizeBuffer } from "./optimizer.js"
export { isSupportedImage, determineOutputPath } from "./helpers.js"
export { processDirectory, processZip, processSingleFile } from "./processors.js"

import { main } from "./cli.js"
import { fileURLToPath } from "node:url"

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url)
if (isDirectRun) {
  main()
}
