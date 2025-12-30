# @mantiqh/image-optimizer

A high-performance CLI tool to batch optimize images (JPEG, PNG, WebP) inside ZIP files.  
It recursively processes nested folders, resizes large images, and compresses them without unzipping manually.

Built for developers and teams to quickly reduce asset sizes before deployment.

## 🚀 Features

- **Zero Config:** Works instantly with defaults.
- **Recursive:** Handles nested folders inside ZIP files perfectly.
- **Smart:** Only processes images (`.jpg`, `.png`, `.webp`); keeps other files intact.
- **Safe:** If an optimized image is larger than the original, it keeps the original.
- **Fast:** Uses `sharp` for high-speed processing.

---

## 📦 Installation & Usage

You don't need to install this permanently. You can run it directly using `npx`.

### Method 1: Run with `npx` (Recommended)

Run it anywhere in your terminal:

```bash
npx @mantiqh/image-optimizer --source ./my-images.zip
```

### Method 2: Global Install

If you use it frequently, install it globally:

```bash
npm install -g @mantiqh/image-optimizer
# or
pnpm add -g @mantiqh/image-optimizer
```

Then run it as a command:

```bash
image-optimizer -s ./assets.zip
```

---

## 🛠 Command Line Options

| Flag        | Alias | Description                                | Default                |
| :---------- | :---- | :----------------------------------------- | :--------------------- |
| `--source`  | `-s`  | **(Required)** Path to the input ZIP file. | -                      |
| `--output`  | `-o`  | Path to save the optimized ZIP.            | `[name]-optimized.zip` |
| `--quality` | `-q`  | Compression quality (1-100).               | `80`                   |
| `--width`   | `-w`  | Max width in pixels (resizes if larger).   | `1600`                 |
| `--help`    | `-h`  | Show help and examples.                    | -                      |

---

## 💡 Examples

### 1. Default Optimization

Optimizes `assets.zip` and saves it as `assets-optimized.zip` in the same folder.

```bash
npx @mantiqh/image-optimizer -s ./assets.zip
```

### 2. Custom Quality & Output

Optimizes `raw.zip`, sets quality to **90%**, and saves it to `final.zip`.

```bash
npx @mantiqh/image-optimizer -s ./raw.zip -o ./final.zip -q 90
```

### 3. Resize Huge Images

Ensures no image in the zip is wider than **800px** (great for thumbnails or mobile assets).

```bash
npx @mantiqh/image-optimizer -s huge-files.zip -w 800
```

---

## 💻 Development

If you want to contribute or modify the tool:

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
    pnpm dev --source ./test-assets.zip
    ```

4.  **Build for production:**
    ```bash
    pnpm build
    ```
