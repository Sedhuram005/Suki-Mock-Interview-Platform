import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

const projectRoot = process.cwd();
for (const fileName of ['.env.local', '.env']) {
  try {
    const contents = fs.readFileSync(path.join(projectRoot, fileName), 'utf8');
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const separator = trimmed.indexOf('=');
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Ignore missing files
  }
}

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is not defined.');

async function clearDatabase() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  console.log('Dropping collections...');

  const collectionsToDrop = [
    'interviews',
    'interviewAudio.files',
    'interviewAudio.chunks',
    'interviewVideos.files',
    'interviewVideos.chunks'
  ];

  for (const colName of collectionsToDrop) {
    try {
      await db.collection(colName).drop();
      console.log(`Dropped collection: ${colName}`);
    } catch (err) {
      if (err.code === 26) {
        console.log(`Collection ${colName} did not exist, skipping.`);
      } else {
        console.error(`Error dropping ${colName}:`, err.message);
      }
    }
  }

  console.log('Database successfully cleared!');
  await mongoose.disconnect();
}

clearDatabase().catch(err => {
  console.error(err);
  process.exit(1);
});
