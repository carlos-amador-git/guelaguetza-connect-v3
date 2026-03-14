/**
 * scripts/compress-models.ts
 *
 * Asset pipeline: compresses .glb models using Draco compression.
 *
 * Usage:
 *   npx tsx scripts/compress-models.ts [input-dir] [output-dir]
 *
 * Defaults:
 *   input-dir  → public/models
 *   output-dir → public/models/compressed
 */

import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import {
  draco,
  dedup,
  prune,
  textureResize,
  flatten,
  join,
} from '@gltf-transform/functions';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MAX_TEXTURE_SIZE = 1024; // px — longest edge capped at 1024

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function pct(original: number, compressed: number): string {
  const ratio = ((original - compressed) / original) * 100;
  return `${ratio.toFixed(1)}%`;
}

function findGlbFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    throw new Error(`Input directory not found: ${dir}`);
  }
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.glb'))
    .map((f) => path.join(dir, f));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function compressModels(inputDir: string, outputDir: string): Promise<void> {
  const files = findGlbFiles(inputDir);

  if (files.length === 0) {
    console.log(`No .glb files found in: ${inputDir}`);
    return;
  }

  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);

  const rows: Array<{
    file: string;
    originalSize: number;
    compressedSize: number;
  }> = [];

  for (const inputPath of files) {
    const filename = path.basename(inputPath);
    const outputPath = path.join(outputDir, filename);

    process.stdout.write(`  Compressing ${filename}… `);

    const originalSize = fs.statSync(inputPath).size;

    // Read → transform → write
    const document = await io.read(inputPath);

    await document.transform(
      // Remove unused nodes, accessors, textures
      dedup(),
      prune(),
      // Flatten scene graph where possible
      flatten(),
      // Join meshes to reduce draw calls
      join(),
      // Resize textures to max 1024×1024
      textureResize({ size: [MAX_TEXTURE_SIZE, MAX_TEXTURE_SIZE] }),
      // Draco mesh compression
      draco(),
    );

    await io.write(outputPath, document);

    const compressedSize = fs.statSync(outputPath).size;

    rows.push({ file: filename, originalSize, compressedSize });

    console.log(
      `done (${formatBytes(originalSize)} → ${formatBytes(compressedSize)}, −${pct(originalSize, compressedSize)})`,
    );
  }

  // ---------------------------------------------------------------------------
  // Summary table
  // ---------------------------------------------------------------------------

  const totalOriginal = rows.reduce((s, r) => s + r.originalSize, 0);
  const totalCompressed = rows.reduce((s, r) => s + r.compressedSize, 0);

  console.log('\n─────────────────────────────────────────────────────────');
  console.log(' File'.padEnd(36) + 'Original'.padEnd(14) + 'Compressed'.padEnd(14) + 'Saved');
  console.log('─────────────────────────────────────────────────────────');

  for (const row of rows) {
    console.log(
      ` ${row.file}`.padEnd(36) +
        formatBytes(row.originalSize).padEnd(14) +
        formatBytes(row.compressedSize).padEnd(14) +
        `−${pct(row.originalSize, row.compressedSize)}`,
    );
  }

  console.log('─────────────────────────────────────────────────────────');
  console.log(
    ' TOTAL'.padEnd(36) +
      formatBytes(totalOriginal).padEnd(14) +
      formatBytes(totalCompressed).padEnd(14) +
      `−${pct(totalOriginal, totalCompressed)}`,
  );
  console.log('─────────────────────────────────────────────────────────\n');
  console.log(`Compressed files written to: ${outputDir}`);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const [, , rawInputDir, rawOutputDir] = process.argv;

const inputDir = path.resolve(rawInputDir ?? 'public/models');
const outputDir = path.resolve(rawOutputDir ?? 'public/models/compressed');

console.log(`\nGuelaguetza Connect — Model Compression Pipeline`);
console.log(`Input:  ${inputDir}`);
console.log(`Output: ${outputDir}\n`);

compressModels(inputDir, outputDir).catch((err) => {
  console.error('Compression failed:', err);
  process.exit(1);
});
