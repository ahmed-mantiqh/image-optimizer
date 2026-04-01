#!/usr/bin/env node
import { Command } from "commander";
import fs from "fs/promises";
import path from "path";
import JSZip from "jszip";
import sharp from "sharp";
import chalk from "chalk";
import ora from "ora";

function logOutputPath(outputPath: string): void {
  console.log(`\n📁 Output: ${chalk.cyan(outputPath)}`);
}

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
  .version("1.2.1")
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
      logOutputPath(outputPath); // Log the output path after processing
    } else if (sourcePath.endsWith(".zip")) {
      // MODE: Zip
      const outputPath = determineOutputPath(
        sourcePath,
        options.output,
        "-optimized.zip"
      );
      spinner.text = "Processing Zip...";
      await processZip(sourcePath, outputPath, config);
      logOutputPath(outputPath); // Log the output path after processing
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
      logOutputPath(outputPath); // Log the output path after processing
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
): Promise<number> {
  if (source === destination) {
    destination += "-1";
  }
  await fs.mkdir(destination, { recursive: true });

  const entries = await fs.readdir(source, { withFileTypes: true });

  const dirEntries = entries.filter(e => e.isDirectory());
  const imageEntries = entries.filter(e => e.isFile() && isSupportedImage(e.name) && path.extname(e.name).toLowerCase() !== ".svg");
  const nonImageEntries = entries.filter(e => e.isFile() && (!isSupportedImage(e.name) || path.extname(e.name).toLowerCase() === ".svg"));

  // Process directories sequentially (recursive)
  for (const entry of dirEntries) {
    await processDirectory(path.join(source, entry.name), path.join(destination, entry.name), config);
  }

  // Process images in parallel batches of 5
  let processedCount = 0;
  const batchSize = 5;
  const totalImages = imageEntries.length;

  for (let i = 0; i < imageEntries.length; i += batchSize) {
    const batch = imageEntries.slice(i, Math.min(i + batchSize, imageEntries.length));
    const results = await Promise.all(batch.map(async (entry, j) => {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);
      const num = i + j + 1;
      config.spinner.text = `Optimizing [${num}/${totalImages}]: ${entry.name}`;
      try {
        const buffer = await fs.readFile(srcPath);
        const optimizedBuffer = await optimizeBuffer(buffer, path.extname(entry.name), config);
        await fs.writeFile(destPath, optimizedBuffer);
        return 1;
      } catch (error: any) {
        console.error(chalk.red(`Failed to optimize ${entry.name}: ${error.message}`));
        await fs.copyFile(srcPath, destPath);
        return 1;
      }
    }));
    processedCount += results.length;
  }

  // Copy non-image files in parallel
  await Promise.all(nonImageEntries.map(entry => {
    return fs.copyFile(path.join(source, entry.name), path.join(destination, entry.name));
  }));

  return processedCount;
}

async function processZip(source: string, destination: string, config: any) {
  const zipData = await fs.readFile(source);
  const zip = await JSZip.loadAsync(zipData);
  const newZip = new JSZip();

  const fileNames = Object.keys(zip.files);
  const imageFiles = fileNames.filter(f => !zip.files[f].dir && isSupportedImage(f) && path.extname(f).toLowerCase() !== ".svg");
  const totalImages = imageFiles.length;
  let imageIndex = 0;

  for (const fileName of fileNames) {
    const file = zip.files[fileName];
    if (file.dir) {
      newZip.folder(fileName);
      continue;
    }

    const content = await file.async("nodebuffer");
    const ext = path.extname(fileName).toLowerCase();

    if (ext === ".svg") {
      newZip.file(fileName, content);
    } else if (isSupportedImage(fileName)) {
      imageIndex++;
      config.spinner.text = `Optimizing in zip [${imageIndex}/${totalImages}]: ${fileName}`;
      try {
        const optimized = await optimizeBuffer(content, path.extname(fileName), config);
        newZip.file(fileName, optimized);
      } catch (error: any) {
        console.error(chalk.red(`Failed to optimize ${fileName}: ${error.message}`));
        newZip.file(fileName, content);
      }
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
}

async function processSingleFile(
  source: string,
  destination: string,
  config: any
) {
  const buffer = await fs.readFile(source);
  const optimized = await optimizeBuffer(buffer, path.extname(source), config);
  await fs.writeFile(destination, optimized);
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
      case ".svg":
        return buffer;
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
