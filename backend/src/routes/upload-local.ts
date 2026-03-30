import { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const UPLOAD_DIR = '/app/public/uploads';

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

        const buffer = await data.toBuffer();
        const ext = data.filename.split('.').pop() || 'jpg';
        const filename = `${randomUUID()}.${ext}`;

        await writeFile(join(UPLOAD_DIR, filename), buffer);

        const url = `/uploads/${filename}`;

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
