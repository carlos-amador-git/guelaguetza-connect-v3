import { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';
import { resolve } from 'path';

// Use UPLOAD_DIR env var, or default to ./public/uploads relative to cwd (works in Docker and local dev)
const UPLOAD_DIR = process.env.UPLOAD_DIR || resolve(process.cwd(), 'public', 'uploads');

// Compression settings
const MAX_WIDTH = 1600;
const MAX_HEIGHT = 1600;
const JPEG_QUALITY = 82;
const WEBP_QUALITY = 80;
const PNG_COMPRESSION = 9;

/**
 * Compress and optimize an uploaded image buffer.
 * - Resizes if either dimension exceeds MAX_WIDTH/MAX_HEIGHT
 * - Applies format-specific compression
 * - Returns the optimized buffer and the output extension
 */
async function optimizeImage(
  buffer: Buffer,
  originalExt: string
): Promise<{ buffer: Buffer; ext: string }> {
  const ext = originalExt.toLowerCase();
  let pipeline = sharp(buffer);

  // Resize large images (keeps aspect ratio)
  pipeline = pipeline.resize({
    width: MAX_WIDTH,
    height: MAX_HEIGHT,
    fit: 'inside',
    withoutEnlargement: true,
  });

  // Strip metadata (EXIF, ICC profiles) to reduce size
  pipeline = pipeline.rotate(); // auto-rotate based on EXIF, then strip

  if (ext === '.jpg' || ext === '.jpeg') {
    const optimized = await pipeline
      .jpeg({ quality: JPEG_QUALITY, progressive: true, mozjpeg: true })
      .toBuffer();
    return { buffer: optimized, ext: '.jpg' };
  }

  if (ext === '.webp') {
    const optimized = await pipeline
      .webp({ quality: WEBP_QUALITY, effort: 6 })
      .toBuffer();
    return { buffer: optimized, ext: '.webp' };
  }

  // PNG and others — optimize as PNG
  const optimized = await pipeline
    .png({ compressionLevel: PNG_COMPRESSION, palette: true, effort: 10 })
    .toBuffer();
  return { buffer: optimized, ext: '.png' };
}

const uploadLocalRoutes: FastifyPluginAsync = async (fastify) => {
  // Ensure upload directory exists
  await mkdir(UPLOAD_DIR, { recursive: true });

  fastify.post(
    '/image',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      try {
        const data = await request.file({
          limits: { fileSize: 10 * 1024 * 1024, files: 1 },
        });

        if (!data) {
          return reply.status(400).send({ success: false, error: 'No se proporcionó archivo' });
        }

        const rawBuffer = await data.toBuffer();
        const originalExt = '.' + (data.filename.split('.').pop() || 'jpg');

        // Optimize image before saving
        const { buffer, ext } = await optimizeImage(rawBuffer, originalExt);
        const filename = `${randomUUID()}${ext}`;

        await writeFile(join(UPLOAD_DIR, filename), buffer);

        const originalKB = Math.round(rawBuffer.length / 1024);
        const compressedKB = Math.round(buffer.length / 1024);
        fastify.log.info(
          `Image uploaded: ${data.filename} (${originalKB}KB → ${compressedKB}KB, -${Math.round((1 - buffer.length / rawBuffer.length) * 100)}%)`
        );

        const url = `/api/uploads/${filename}`;

        return reply.send({
          success: true,
          data: { url, key: filename },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, error: 'Error al subir imagen' });
      }
    }
  );
};

export default uploadLocalRoutes;
