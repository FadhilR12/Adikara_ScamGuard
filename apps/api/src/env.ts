import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databasePath: path.resolve(root, process.env.DATABASE_PATH ?? './data/scamguard.db'),
  uploadDir: path.resolve(root, process.env.UPLOAD_DIR ?? './uploads'),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(',').map((s) => s.trim()).filter(Boolean),
  allowAnyExtension: (process.env.ALLOW_ANY_EXTENSION ?? 'true') === 'true',
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 10),
  maxFilesPerIncident: 10,
};
