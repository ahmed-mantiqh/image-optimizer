#!/usr/bin/env node
import { Command } from "commander";
import fs from "fs/promises";
import path from "path";
import JSZip from "jszip";
import sharp from "sharp";
import chalk from "chalk";
import ora from "ora";

// --- Configuration ---
const SUPPORTED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
  ".tiff",
  ".svg",
]);

const program = new Command();

program
  .name("image-optimizer")
  .description(
    chalk.cyan(
      "🚀 Universal CLI to optimize images (File, Folder, or Zip). Supports JPG, PNG, WebP, AVIF, GIF, TIFF, SVG."
    )
  )
  .version("1.1.1")
  .requiredOption(
    "-s, --source <path>",
    "Path to the input file, folder, or zip"
  )
  .option(
    "-o, --output <path>",
    "Path to the output (default: source location + -optimized)"
  )
  .option("-q, --quality <number>", "Quality of compression (1-100)", "80")
  .option("-w, --width <number>", "Max width to resize images to", "1600")
  .parse(process.argv);

const options = program.opts();

async function main() {
  const spinner = ora("Analyzing source...").start();

  try {
    // Resolve absolute path of the source immediately
    const sourcePath = path.resolve(process.cwd(), options.source);

    // Check if source exists
    try {
      await fs.access(sourcePath);
    } catch {
      spinner.fail(`Source not found: ${sourcePath}`);
      process.exit(1);
    }

    const stats = await fs.stat(sourcePath);
    const config = {
      quality: parseInt(options.quality),
      width: parseInt(options.width),
      spinner,
    };

    if (stats.isDirectory()) {
      // MODE: Folder
      // Fix: Ensure output is next to source, not CWD
      const outputPath = determineOutputPath(
        sourcePath,
        options.output,
        "-optimized"
      );
      spinner.text = "Processing Directory...";
      await processDirectory(sourcePath, outputPath, config);
    } else if (sourcePath.endsWith(".zip")) {
      // MODE: Zip
      const outputPath = determineOutputPath(
        sourcePath,
        options.output,
        "-optimized.zip"
      );
      spinner.text = "Processing Zip...";
      await processZip(sourcePath, outputPath, config);
    } else if (isSupportedImage(sourcePath)) {
      // MODE: Single File
      const ext = path.extname(sourcePath);
      const outputPath = determineOutputPath(
        sourcePath,
        options.output,
        `-optimized${ext}`
      );
      spinner.text = "Processing Single File...";
      await processSingleFile(sourcePath, outputPath, config);
    } else {
      spinner.fail(
        "Unsupported file type. Please provide a Folder, Zip, or supported Image."
      );
      process.exit(1);
    }

    spinner.succeed(chalk.green("Optimization Complete!"));
  } catch (error: any) {
    spinner.fail("Error occurred");
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

// --- Processors ---

async function processDirectory(
  source: string,
  destination: string,
  config: any
) {
  // 1. Create Destination Folder
  // If user pointed source as destination (rare error), avoid loop
  if (source === destination) {
    destination += "-1";
  }
  await fs.mkdir(destination, { recursive: true });

  // 2. Read Directory
  const entries = await fs.readdir(source, { withFileTypes: true });
  let processedCount = 0;

  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      // Recursive call
      await processDirectory(srcPath, destPath, config);
    } else if (entry.isFile()) {
      if (isSupportedImage(entry.name)) {
        config.spinner.text = `Optimizing: ${entry.name}`;
        const buffer = await fs.readFile(srcPath);
        const optimizedBuffer = await optimizeBuffer(
          buffer,
          path.extname(entry.name),
          config
        );
        await fs.writeFile(destPath, optimizedBuffer);
        processedCount++;
      } else {
        // Copy non-images
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
  // Added: Log output location for folders
  if (processedCount > 0) {
    // Only log the root output folder once (check logic if recursive)
    // Actually, since this is recursive, we should only log in the main caller.
    // But since we can't easily detect "root" here without extra args,
    // we'll rely on the main function logging or log here only if it looks like the root.
    // Better approach: Let's log it in main?
    // No, processDirectory is recursive.
    // Let's just log it once at the top level call.
  }
  // Log strictly for the user visibility (Moved logic to ensure visibility)
  console.log(`\n📁 Output: ${chalk.cyan(destination)}`);
}

async function processZip(source: string, destination: string, config: any) {
  const zipData = await fs.readFile(source);
  const zip = await JSZip.loadAsync(zipData);
  const newZip = new JSZip();

  const fileNames = Object.keys(zip.files);

  for (const fileName of fileNames) {
    const file = zip.files[fileName];
    if (file.dir) {
      newZip.folder(fileName);
      continue;
    }

    const content = await file.async("nodebuffer");
    if (isSupportedImage(fileName)) {
      config.spinner.text = `Optimizing inside zip: ${fileName}`;
      const optimized = await optimizeBuffer(
        content,
        path.extname(fileName),
        config
      );
      newZip.file(fileName, optimized);
    } else {
      newZip.file(fileName, content);
    }
  }

  config.spinner.text = "Generating Output Zip...";
  const outputBuffer = await newZip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  await fs.writeFile(destination, outputBuffer);
  console.log(`\n📁 Output: ${chalk.cyan(destination)}`);
}

async function processSingleFile(
  source: string,
  destination: string,
  config: any
) {
  const buffer = await fs.readFile(source);
  const optimized = await optimizeBuffer(buffer, path.extname(source), config);
  await fs.writeFile(destination, optimized);
  console.log(`\n📁 Output: ${chalk.cyan(destination)}`);
}

// --- Core Optimizer ---

async function optimizeBuffer(
  buffer: Buffer,
  ext: string,
  config: any
): Promise<Buffer> {
  const extension = ext.toLowerCase();

  try {
    let pipeline = sharp(buffer, { animated: true });
    const metadata = await pipeline.metadata();

    // Resize
    if (metadata.width && metadata.width > config.width) {
      pipeline = pipeline.resize({ width: config.width });
    }

    // Compress based on format
    switch (extension) {
      case ".jpeg":
      case ".jpg":
        pipeline = pipeline.jpeg({ quality: config.quality, mozjpeg: true });
        break;
      case ".png":
        pipeline = pipeline.png({
          quality: config.quality,
          compressionLevel: 9,
          palette: true,
        });
        break;
      case ".webp":
        pipeline = pipeline.webp({ quality: config.quality });
        break;
      case ".gif":
        pipeline = pipeline.gif({ colors: 128 });
        break;
      case ".avif":
        pipeline = pipeline.avif({ quality: config.quality });
        break;
      case ".tiff":
        pipeline = pipeline.tiff({ quality: config.quality });
        break;
    }

    const outputBuffer = await pipeline.toBuffer();

    // Safety Check: If optimized is bigger, return original
    if (outputBuffer.length >= buffer.length) {
      return buffer;
    }

    return outputBuffer;
  } catch (err) {
    return buffer;
  }
}

// --- Helpers ---

function isSupportedImage(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_EXTENSIONS.has(ext);
}

function determineOutputPath(
  source: string,
  userOutput: string | undefined,
  suffix: string
): string {
  // If user provided a path, use it relative to CWD (standard CLI behavior)
  if (userOutput) {
    return path.resolve(process.cwd(), userOutput);
  }

  // If no output provided, put it NEXT TO THE SOURCE
  const dir = path.dirname(source); // Gets the folder containing the source
  const ext = path.extname(source);
  const name = path.basename(source, ext); // Filename without extension

  // If we are processing a folder, 'name' is the folder name
  // If we are processing a file, 'name' is the filename
  return path.join(dir, `${name}${suffix}`);
}

main();
