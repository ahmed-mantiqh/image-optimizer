# @mantiqh/image-optimizer

A universal, high-performance CLI tool to optimize images.  
It works on **Zips, Folders, and Single Files**, recursively processing nested directories and maintaining exact file structures.

Built for developers to quickly reduce asset sizes before deployment without complex configs.

## 🚀 Features

- **Universal Input:** Works on `.zip` files, local folders, or single images.
- **Recursive:** Process entire directory trees; copies non-image files (CSS, JS) unchanged.
- **Expanded Support:** Optimizes `JPG`, `PNG`, `WebP`, `AVIF`, `GIF`, `TIFF`. SVGs are skipped (copied as-is).
- **Fast:** Parallel processing — optimizes up to 5 images concurrently per directory.
- **Progress Tracking:** Shows `[N/total]` progress while optimizing.
- **Smart Output:** Creates optimized versions _next to_ your source files by default.
- **Safe:** If an optimized image is larger than the original, it keeps the original.

---

## 📦 Installation & Usage

### Method 1: Run with `npx` (Recommended)

No installation required. Run it anywhere:

```bash
npx @mantiqh/image-optimizer --source ./assets.zip
```

### Method 2: Global Install

If you use it frequently:

```bash
npm install -g @mantiqh/image-optimizer
```

Then run:

```bash
image-optimizer -s ./public/images
```

---

## 💡 Examples

### 1. Optimize a Zip File

Reads `assets.zip`, optimizes images inside, and saves as `assets-optimized.zip`.

```bash
npx @mantiqh/image-optimizer -s ./assets.zip
```

### 2. Optimize a Folder (Recursive)

Optimizes all images inside `./public`, creates `./public-optimized`, and copies all other files (fonts, videos, etc.).

```bash
npx @mantiqh/image-optimizer -s ./public
```

### 3. Optimize a Single File

Optimizes `hero.png` and saves it as `hero-optimized.png`.

```bash
npx @mantiqh/image-optimizer -s ./hero.png
```

### 4. Custom Output & Quality

Optimizes a folder with **90% quality** and saves to a specific location.

```bash
npx @mantiqh/image-optimizer -s ./raw-photos -o ./website-ready -q 90
```

---

## 🛠 Command Line Options

| Flag        | Alias | Description                                  | Default              |
| :---------- | :---- | :------------------------------------------- | :------------------- |
| `--source`  | `-s`  | **(Required)** Path to file, folder, or zip. | -                    |
| `--output`  | `-o`  | Custom output path.                          | `[source]-optimized` |
| `--quality` | `-q`  | Compression quality (1-100).                 | `80`                 |
| `--width`   | `-w`  | Max width in pixels (resizes if larger).     | `1600`               |
| `--help`    | `-h`  | Show help and examples.                      | -                    |

---

## 💻 Development

1.  **Clone the repo:**

    ```bash
    git clone <your-repo-url>
    cd image-optimizer
    ```

2.  **Install dependencies:**

    ```bash
    pnpm install
    ```

3.  **Run in dev mode:**

    ```bash
    # Test on a folder
    pnpm dev --source ~/Desktop/test-folder
    ```

4.  **Build:**
    ```bash
    pnpm build
    ```
