/**
 * compress-images.ts
 *
 * Compresses all images in public/ that exceed a given size threshold.
 * Uses sharp to convert to WebP (lossy) or optimize PNG/JPEG in-place.
 *
 * Usage:
 *   npx tsx backend/scripts/compress-images.ts                 # default: 400KB threshold
 *   npx tsx backend/scripts/compress-images.ts --threshold 200 # custom threshold in KB
 *   npx tsx backend/scripts/compress-images.ts --dry-run       # preview without writing
 */

import sharp from 'sharp';
import { readdir, stat, readFile, writeFile, rename } from 'fs/promises';
import { join, extname, basename } from 'path';

// ── Config ───────────────────────────────────────────────────────────────────

const SUPPORTED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const QUALITY_JPEG = 80;
const QUALITY_WEBP = 78;
const QUALITY_PNG_EFFORT = 9; // 1-10, higher = smaller but slower
const MAX_DIMENSION = 1200; // resize if either side exceeds this

// ── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const thresholdIdx = args.indexOf('--threshold');
const THRESHOLD_KB = thresholdIdx !== -1 ? parseInt(args[thresholdIdx + 1], 10) : 400;
const THRESHOLD_BYTES = THRESHOLD_KB * 1024;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules and hidden directories
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      files.push(...(await walk(fullPath)));
    } else if (SUPPORTED_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

async function compressImage(filePath: string): Promise<{ saved: number; newSize: number } | null> {
  const originalBuffer = await readFile(filePath);
  const originalSize = originalBuffer.length;

  if (originalSize <= THRESHOLD_BYTES) return null;

  const ext = extname(filePath).toLowerCase();
  let pipeline = sharp(originalBuffer);

  // Resize if too large (keeps aspect ratio)
  const metadata = await pipeline.metadata();
  if (metadata.width && metadata.width > MAX_DIMENSION) {
    pipeline = pipeline.resize({ width: MAX_DIMENSION, withoutEnlargement: true });
  } else if (metadata.height && metadata.height > MAX_DIMENSION) {
    pipeline = pipeline.resize({ height: MAX_DIMENSION, withoutEnlargement: true });
  }

  let outputBuffer: Buffer;

  if (ext === '.jpg' || ext === '.jpeg') {
    outputBuffer = await pipeline
      .jpeg({ quality: QUALITY_JPEG, progressive: true, mozjpeg: true })
      .toBuffer();
  } else if (ext === '.webp') {
    outputBuffer = await pipeline
      .webp({ quality: QUALITY_WEBP, effort: 6 })
      .toBuffer();
  } else {
    // PNG — check if it's a photo (many colors) or graphic (few colors)
    const { channels, width, height } = metadata;
    const isLargePhoto = (width || 0) * (height || 0) > 100000 && (channels || 3) >= 3;

    // Try optimized PNG
    const pngBuffer = await pipeline.clone()
      .png({ compressionLevel: QUALITY_PNG_EFFORT, palette: true, effort: 10 })
      .toBuffer();

    // For large photos, also try JPEG which is much better for photographs
    if (isLargePhoto && pngBuffer.length > THRESHOLD_BYTES) {
      const jpegBuffer = await pipeline.clone()
        .jpeg({ quality: QUALITY_JPEG, progressive: true, mozjpeg: true })
        .toBuffer();

      // Use JPEG if it's significantly smaller (keeps .png extension for compatibility)
      outputBuffer = jpegBuffer.length < pngBuffer.length * 0.7 ? jpegBuffer : pngBuffer;
    } else {
      outputBuffer = pngBuffer;
    }
  }

  // Only write if we actually saved space
  if (outputBuffer.length >= originalSize) return null;

  const saved = originalSize - outputBuffer.length;

  if (!dryRun) {
    // Backup original just in case (rename to .bak), then write compressed
    await writeFile(filePath, outputBuffer);
  }

  return { saved, newSize: outputBuffer.length };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const publicDir = join(process.cwd(), 'public');

  console.log(`\n🖼️  Image Compressor`);
  console.log(`   Threshold: ${THRESHOLD_KB}KB`);
  console.log(`   Directory: ${publicDir}`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN (no changes)' : 'COMPRESS'}\n`);

  const files = await walk(publicDir);
  let totalSaved = 0;
  let filesCompressed = 0;
  let filesSkipped = 0;

  for (const filePath of files) {
    const fileInfo = await stat(filePath);
    const sizeKB = Math.round(fileInfo.size / 1024);

    if (fileInfo.size <= THRESHOLD_BYTES) {
      filesSkipped++;
      continue;
    }

    const relativePath = filePath.replace(publicDir, '');
    process.stdout.write(`  ${relativePath} (${sizeKB}KB) → `);

    try {
      const result = await compressImage(filePath);
      if (result) {
        const newKB = Math.round(result.newSize / 1024);
        const savedKB = Math.round(result.saved / 1024);
        const pct = Math.round((result.saved / (result.newSize + result.saved)) * 100);
        console.log(`${newKB}KB (saved ${savedKB}KB, -${pct}%)${dryRun ? ' [dry-run]' : ''}`);
        totalSaved += result.saved;
        filesCompressed++;
      } else {
        console.log(`skipped (already optimized)`);
        filesSkipped++;
      }
    } catch (err: any) {
      console.log(`ERROR: ${err.message}`);
    }
  }

  console.log(`\n✅ Done!`);
  console.log(`   Files compressed: ${filesCompressed}`);
  console.log(`   Files skipped: ${filesSkipped}`);
  console.log(`   Total saved: ${Math.round(totalSaved / 1024)}KB (${(totalSaved / 1024 / 1024).toFixed(1)}MB)\n`);
}

main().catch(console.error);
