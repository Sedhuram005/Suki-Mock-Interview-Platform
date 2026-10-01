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
    // Continue; the required connection string is checked below.
  }
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not defined. Add it to .env.local or .env');
  process.exit(1);
}

const exportDir = path.join(projectRoot, 'exports');
fs.mkdirSync(exportDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const jsonFile = path.join(exportDir, `database-${timestamp}.json`);
const csvFile = path.join(exportDir, `database-${timestamp}.csv`);

function csvValue(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function main() {
  await mongoose.connect(uri, {
    bufferCommands: false,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    socketTimeoutMS: 30000,
  });

  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection is not ready.');

  const collectionInfos = await db.listCollections({}, { nameOnly: true }).toArray();
  collectionInfos.sort((left, right) => left.name.localeCompare(right.name));

  const collections = {};
  const csvRows = [['collection', 'documentId', 'documentJSON'].join(',')];
  let documentCount = 0;

  for (const { name } of collectionInfos) {
    const documents = await db.collection(name).find({}).sort({ _id: 1 }).toArray();
    collections[name] = documents;
    documentCount += documents.length;

    for (const document of documents) {
      csvRows.push([
        csvValue(name),
        csvValue(document._id?.toString?.() ?? ''),
        csvValue(JSON.stringify(document)),
      ].join(','));
    }

    console.log(`Read ${documents.length} document(s) from ${name}`);
  }

  const payload = {
    database: db.databaseName,
    exportedAt: new Date().toISOString(),
    collections,
  };

  fs.writeFileSync(jsonFile, JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(csvFile, `${csvRows.join('\n')}\n`, 'utf8');
  console.log(`Exported ${documentCount} document(s) across ${collectionInfos.length} collection(s).`);
  console.log(`JSON: ${jsonFile}`);
  console.log(`CSV: ${csvFile}`);
  console.log('These full database exports may contain sensitive user data; keep them private.');
}

main()
  .catch((error) => {
    console.error('Database export failed:', error.message || error);
    process.exitCode = 1;
  })
  .finally(() => {
    mongoose.disconnect().catch(() => {});
  });