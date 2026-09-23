import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const DOWNLOADS_DIR = path.join(process.cwd(), 'downloads', 'loudoun');
const SOURCE_ID = 'loudoun-data-center-search';

function ensureSource(sourceId: string, sourcePath: string) {
  try {
    const sources = execSync('gbrain sources list', { encoding: 'utf-8' });
    if (sources.includes(sourceId)) {
      console.log(`Source ${sourceId} already registered.`);
      return;
    }
  } catch {
    // ignore, source may not exist
  }

  execSync(`gbrain sources add ${sourceId} --path ${sourcePath}`, { stdio: 'inherit' });
}

function main() {
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    console.error(`Download directory not found: ${DOWNLOADS_DIR}`);
    console.error('Run `npm run scrape` first to fetch Loudoun County search results.');
    process.exit(1);
  }

  console.log(`🧠 Ingesting Loudoun data-center search results into GBrain source: ${SOURCE_ID}`);

  ensureSource(SOURCE_ID, DOWNLOADS_DIR);

  try {
    // Import markdown files from the downloads directory
    execSync(`gbrain import ${DOWNLOADS_DIR} --source ${SOURCE_ID}`, { stdio: 'inherit' });

    // Run extraction and embeddings
    console.log('\n🔍 Extracting links and timeline...');
    execSync(`gbrain extract all --source ${SOURCE_ID}`, { stdio: 'inherit' });

    console.log('\n🧮 Computing embeddings...');
    execSync(`gbrain embed --all --source ${SOURCE_ID}`, { stdio: 'inherit' });

    console.log('\n✅ GBrain ingestion complete.');
  } catch (error) {
    console.error('GBrain ingestion failed:', error);
    process.exit(1);
  }
}

main();
