import { createApp } from './app';
import { openDb } from './db/client';
import { seed } from './db/seed';
import { env } from './env';

const db = openDb();
seed(db); // idempoten: memastikan aturan bawaan & data demo ada

createApp(db).listen(env.port, () => {
  console.log(`ScamGuard API berjalan di http://localhost:${env.port}/api/v1`);
});
