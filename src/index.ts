#!/usr/bin/env node
export { optimizeBuffer } from "./optimizer.js"
export { isSupportedImage, determineOutputPath, logOutputPath } from "./helpers.js"
export { processDirectory, processZip, processSingleFile } from "./processors.js"

import { main } from "./cli.js"
import { fileURLToPath } from "node:url"
import { realpathSync } from "node:fs"

const isDirectRun = realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
if (isDirectRun) {
  main()
}
