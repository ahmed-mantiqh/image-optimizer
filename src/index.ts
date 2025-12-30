#!/usr/bin/env node
import { Command } from "commander";
import fs from "fs/promises";
import path from "path";
import JSZip from "jszip";
import sharp from "sharp";
import chalk from "chalk";
import ora from "ora";

const program = new Command();

program
  .name("image-optimizer")
  .description(
    chalk.cyan(
      "🚀 CLI to optimize images (JPEG, PNG, WebP) inside a zip file recursively."
    )
  )
  .version("1.0.0")
  .requiredOption("-s, --source <path>", "Path to the input zip file")
  .option(
    "-o, --output <path>",
    "Path to the output zip file (defaults to [name]-optimized.zip)"
  )
  .option("-q, --quality <number>", "Quality of compression (1-100)", "80")
  .option("-w, --width <number>", "Max width to resize images to", "1600")
  .addHelpText(
    "after",
    `
${chalk.yellow("Examples:")}
  ${chalk.green("$ npx @mantiqh/image-optimizer --source assets.zip")}
  ${chalk.gray(
    "# Optimizes assets.zip and saves as assets-optimized.zip (default settings)"
  )}

  ${chalk.green(
    "$ npx @mantiqh/image-optimizer -s ./raw.zip -o ./final.zip -q 90"
  )}
  ${chalk.gray("# Optimizes raw.zip to final.zip with 90% quality")}

  ${chalk.green("$ npx @mantiqh/image-optimizer -s huge-images.zip -w 800")}
  ${chalk.gray("# Resizes all images to max 800px width")}
`
  )
  .parse(process.argv);

const options = program.opts();

async function main() {
  const spinner = ora("Starting optimization...").start();

  try {
    // 1. Resolve Paths
    const sourcePath = path.resolve(process.cwd(), options.source);

    // Default output name if not provided: input-optimized.zip
    let outputPath: string;
    if (options.output) {
      outputPath = path.resolve(process.cwd(), options.output);
    } else {
      const dir = path.dirname(sourcePath);
      const ext = path.extname(sourcePath);
      const name = path.basename(sourcePath, ext);
      outputPath = path.join(dir, `${name}-optimized${ext}`);
    }

    if (!(await fileExists(sourcePath))) {
      spinner.fail(`Source file not found: ${sourcePath}`);
      process.exit(1);
    }

    // 2. Read Zip
    spinner.text = "Reading zip file...";
    const zipData = await fs.readFile(sourcePath);
    const zip = await JSZip.loadAsync(zipData);

    const newZip = new JSZip();
    const quality = parseInt(options.quality);
    const maxWidth = parseInt(options.width);

    // 3. Process Entries
    const fileNames = Object.keys(zip.files);
    let processedCount = 0;
    let savedBytes = 0;

    spinner.text = `Found ${fileNames.length} files. Processing...`;

    // Process in parallel (batches) or sequence. Sequence is safer for memory.
    for (const fileName of fileNames) {
      const file = zip.files[fileName];

      if (file.dir) {
        newZip.folder(fileName);
        continue;
      }

      const content = await file.async("nodebuffer");
      const ext = path.extname(fileName).toLowerCase();

      // Check if it's an image we can optimize
      if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
        try {
          spinner.text = `Optimizing: ${fileName}`;

          // Sharp Optimization Pipeline
          let pipeline = sharp(content);
          const metadata = await pipeline.metadata();

          // Resize if too big
          if (metadata.width && metadata.width > maxWidth) {
            pipeline = pipeline.resize({ width: maxWidth });
          }

          // Compress based on format
          if (ext === ".png") {
            pipeline = pipeline.png({ quality: quality, compressionLevel: 9 });
          } else if (ext === ".webp") {
            pipeline = pipeline.webp({ quality: quality });
          } else {
            // Default to jpeg/mozjpeg
            pipeline = pipeline.jpeg({ quality: quality, mozjpeg: true });
          }

          const optimizedBuffer = await pipeline.toBuffer();

          // Calculate savings
          const diff = content.length - optimizedBuffer.length;
          if (diff > 0) {
            savedBytes += diff;
            newZip.file(fileName, optimizedBuffer);
          } else {
            // If optimization made it bigger (rare), keep original
            newZip.file(fileName, content);
          }
          processedCount++;
        } catch (err) {
          // If sharp fails (corrupt image?), keep original
          newZip.file(fileName, content);
        }
      } else {
        // Non-image files: just copy them
        newZip.file(fileName, content);
      }
    }

    // 4. Write Output Zip
    spinner.text = "Generating output zip...";

    // Generate zip as nodebuffer (works better for CLI files)
    const outputBuffer = await newZip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    await fs.writeFile(outputPath, outputBuffer);

    spinner.succeed(chalk.green("Optimization Complete!"));
    console.log(`\n📁 Output: ${chalk.cyan(outputPath)}`);
    console.log(`🖼️  Images Processed: ${processedCount}`);
    console.log(
      `💾 Space Saved: ${chalk.bold(
        (savedBytes / 1024 / 1024).toFixed(2)
      )} MB\n`
    );
  } catch (error: any) {
    spinner.fail("Error occurred");
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

// Helper to check file existence
async function fileExists(path: string) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

main();
