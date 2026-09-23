import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';
import { execSync } from 'child_process';
import { htmlToMarkdown } from '../src/lib/scrapers/html-to-text.js';

dotenv.config({ path: '.env.local' });

const DOWNLOADS_DIR = path.join(process.cwd(), 'downloads', 'loudoun');
const GBRAIN_IMPORT_DIR = path.join(process.cwd(), 'gbrain', 'import');
const DATA_DIR = path.join(process.cwd(), 'data');
const SOURCE_ID = 'loudoun-data-center-search';

interface Resource {
  title: string;
  url: string;
  type: 'html' | 'pdf';
}

const RESOURCES: Resource[] = [
  {
    title: 'Data Center Standards & Locations',
    url: 'https://www.loudoun.gov/5990/Data-Center-Standards-Locations',
    type: 'html',
  },
  {
    title: 'Data Centers in Loudoun County',
    url: 'https://www.loudoun.gov/6188/Data-Centers-in-Loudoun-County',
    type: 'html',
  },
  {
    title: 'Noise & Air Quality Concerns',
    url: 'https://www.loudoun.gov/6405/Noise-Air-Quality-Concerns',
    type: 'html',
  },
  {
    title: 'Phase 2: Data Center Standards & Locations',
    url: 'https://sheriff.loudoun.gov/6222/Phase-2-Data-Center-Standards-Locations',
    type: 'html',
  },
  {
    title: 'Data Center Fact Sheet 2026',
    url: 'https://www.loudoun.gov/DocumentCenter/View/222193/FINAL-Data-Center-Fact-Sheet-2026?bidId=',
    type: 'pdf',
  },
  {
    title: 'Data Center - Residents',
    url: 'https://www.loudoun.gov/DocumentCenter/View/222194/FINAL-Data-Center---Residents?bidId=',
    type: 'pdf',
  },
  {
    title: '15 Best Practices for Communities Considering Data Centers',
    url: 'https://www.loudoun.gov/DocumentCenter/View/217610/15-Best-Practices-for-Communities-Considering-Data-Centers?bidId=',
    type: 'pdf',
  },
  {
    title: 'CPAM-ZOAM Phase 1 Board Report',
    url: 'https://lfportal.loudoun.gov/LFPortalinternet/0/edoc/1952618/Item%2007%20Data%20Center%20Standards%20%20Locations%20CPAM-ZOAM%20Phase%201.pdf',
    type: 'pdf',
  },
  {
    title: 'Data Center Standards and Location Project Plan',
    url: 'https://lfportal.loudoun.gov/LFPortalinternet/0/edoc/592700/Item%2004%20Data%20Center%20Standards%20and%20Location%20Project%20Plan.pdf',
    type: 'pdf',
  },
];

function urlToFileName(_urlStr: string, index: number): string {
  return `page_${index.toString().padStart(3, '0')}`;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchHtml(resource: Resource): Promise<string> {
  const response = await axios.get(resource.url, {
    headers: {
      'User-Agent': 'LoudounDataCenterResearchBot/1.0',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    timeout: 30000,
  });

  const pageContent = htmlToMarkdown(response.data, resource.url);
  return `# ${pageContent.title}\n\n**Source:** [${resource.url}](${resource.url})\n\n**Resource type:** HTML page\n\n---\n\n${pageContent.markdown}`;
}

async function fetchPdf(resource: Resource, index: number): Promise<string> {
  const response = await axios.get(resource.url, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'LoudounDataCenterResearchBot/1.0',
    },
    timeout: 60000,
  });

  const pdfPath = path.join(DOWNLOADS_DIR, `${urlToFileName(resource.url, index)}.pdf`);
  fs.writeFileSync(pdfPath, Buffer.from(response.data));

  const extract = require('pdf-text-extract');
  const pages: string[] = await new Promise((resolve, reject) => {
    extract(pdfPath, (err: any, result: string[]) => {
      if (err) reject(err);
      else resolve(result || []);
    });
  });

  const body = pages.join('\n');
  return `# ${resource.title}\n\n**Source:** [${resource.url}](${resource.url})\n\n**Resource type:** PDF\n\n---\n\n${body}`;
}

async function main() {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  fs.mkdirSync(GBRAIN_IMPORT_DIR, { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const savedPages: { url: string; filePath: string }[] = [];
  const results = [];
  let resourceIndex = 0;

  for (const resource of RESOURCES) {
    console.log(`Fetching: ${resource.title}`);
    console.log(`  ${resource.url}`);

    try {
      const content = resource.type === 'pdf' ? await fetchPdf(resource, resourceIndex) : await fetchHtml(resource);
      const fileName = `${urlToFileName(resource.url, resourceIndex)}.md`;
      const filePath = path.join(DOWNLOADS_DIR, fileName);
      fs.writeFileSync(filePath, content);

      const gbrainFilePath = path.join(GBRAIN_IMPORT_DIR, fileName);
      fs.writeFileSync(gbrainFilePath, content);

      savedPages.push({ url: resource.url, filePath });
      resourceIndex++;
      results.push({
        title: resource.title,
        url: resource.url,
        snippet: `Public resource about Loudoun County data centers: ${resource.title}`,
      });

      console.log(`  Saved to ${filePath}\n`);
    } catch (error) {
      console.error(`  Failed to fetch ${resource.url}:`, error instanceof Error ? error.message : String(error));
    }

    await delay(1000);
  }

  const metadata = {
    totalResults: results.length,
    pagesScraped: 1,
    results,
    errors: [],
    savedPages,
  };

  fs.writeFileSync(path.join(DATA_DIR, 'loudoun-search-results.json'), JSON.stringify(metadata, null, 2));
  console.log(`✅ Saved metadata to ${path.join(DATA_DIR, 'loudoun-search-results.json')}`);
  console.log(`   Fetched ${savedPages.length} resources.\n`);

  console.log('📝 Generating wikis...');
  const { generateLoudounWikis } = await import('../src/lib/wiki-generator-loudoun.js');
  const wikiResult = await generateLoudounWikis();
  console.log(`   Processed ${wikiResult.processed} wiki pages.`);
  if (wikiResult.errors.length > 0) {
    console.log('   Errors:', wikiResult.errors);
  }

  console.log('\n🧠 Ingesting into GBrain...');
  try {
    execSync(`gbrain sources add ${SOURCE_ID} --path ${GBRAIN_IMPORT_DIR}`, { stdio: 'ignore' });
  } catch {
    // Source may already exist
  }

  execSync(`gbrain import ${GBRAIN_IMPORT_DIR} --source ${SOURCE_ID}`, { stdio: 'inherit' });
  execSync(`gbrain extract all`, { stdio: 'inherit' });
  execSync(`gbrain embed --all`, { stdio: 'inherit' });
  console.log('✅ GBrain ingestion complete.\n');

  console.log('Next steps:');
  console.log('  - npm run dev');
  console.log('  - Open http://localhost:3000');
  console.log('  - Use /gbrain-chat to query GBrain');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
