import axios from 'axios';
import * as cheerio from 'cheerio';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

dotenv.config({ path: '.env.local' });

const GBRAIN_IMPORT_DIR = path.join(process.cwd(), 'gbrain', 'import');
const SOURCE_ID = 'loudoun-data-center-search';
const DELAY_MS = 2500;

const HANDLES: string[] = [
  'LoudounCoGovt',
  'LoudounBiz',
  'LoudounSheriff',
  'LoudounFire',
  'GreenLoudoun',
  'LoudounMapping',
  'Loudounvote',
  'LoudounCoHealth',
  'LoudounLibrary',
  'LoudounPRCS',
  'LoudounAnimals',
  'LoudounOCA',
  'LoudounSmallBiz',
  'LoudounFarms',
];

interface Tweet {
  statusUrl: string;
  timestamp: string;
  text: string;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract the tweet body from an entry's flattened text.
 * Shape after stripping scripts: "DisplayName@Handle<rel-date><tweet text><counts>"
 * e.g. "Loudoun Co. Govt.@LoudounCoGovtSep 21#Loudoun County is ...21539"
 */
function parseEntryText(raw: string, handle: string): { timestamp: string; text: string } {
  const marker = `@${handle}`;
  const idx = raw.indexOf(marker);
  let rest = idx >= 0 ? raw.slice(idx + marker.length) : raw;

  const dateMatch = rest.match(/^(\d{1,2}[hms]|[A-Z][a-z]{2} \d{1,2}|[A-Z][a-z]{2} \d{1,2}, \d{4})/);
  const timestamp = dateMatch ? dateMatch[1] : '';
  if (dateMatch) rest = rest.slice(dateMatch[0].length);

  // Strip trailing engagement counts (e.g. "21539") — a run of digits/K at the end
  rest = rest.replace(/(\d[\d,.KM]*)$/, '').trim();

  return { timestamp, text: rest };
}

async function scrapeHandle(handle: string): Promise<Tweet[]> {
  const url = `https://x.com/${handle}`;
  const response = await axios.get<string>(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: 30000,
  });

  const $ = cheerio.load(response.data);
  $('script,style,noscript').remove();

  const tweets: Tweet[] = [];
  $('[data-timeline-entry]').each((_i: number, el: cheerio.Element) => {
    const $el = $(el);
    const dataHref = $el.attr('data-href');
    if (!dataHref || !dataHref.includes('/status/')) return;

    const statusUrl = `https://x.com${dataHref}`;
    const { timestamp, text } = parseEntryText($el.text().replace(/\s+/g, ' ').trim(), handle);
    if (text.length > 10) {
      tweets.push({ statusUrl, timestamp, text });
    }
  });

  return tweets;
}

async function main(): Promise<void> {
  fs.mkdirSync(GBRAIN_IMPORT_DIR, { recursive: true });

  console.log(`🐦 Scraping X profiles for ${HANDLES.length} Loudoun County accounts...\n`);

  const files: string[] = [];

  for (const handle of HANDLES) {
    console.log(`Fetching @${handle}...`);
    try {
      const tweets = await scrapeHandle(handle);
      if (tweets.length === 0) {
        console.log(`  ⚠️  No tweets extracted`);
        continue;
      }

      const lines = tweets.map(t =>
        `### ${t.timestamp || 'Recent'} — [${t.statusUrl}](${t.statusUrl})\n\n${t.text}\n`
      );

      const markdown = `# @${handle} — Recent Posts (X)\n\n**Source:** [https://x.com/${handle}](https://x.com/${handle})\n\n**Resource type:** X feed scrape\n\n---\n\n${lines.join('\n')}`;
      const filePath = path.join(GBRAIN_IMPORT_DIR, `x_${handle.toLowerCase()}.md`);
      fs.writeFileSync(filePath, markdown);
      files.push(filePath);
      console.log(`  ✅ ${tweets.length} tweets → x_${handle.toLowerCase()}.md`);
    } catch (error) {
      console.error(`  ❌ @${handle} failed:`, error instanceof Error ? error.message : String(error));
    }
    await delay(DELAY_MS);
  }

  console.log(`\n✅ Wrote ${files.length} feed files to ${GBRAIN_IMPORT_DIR}`);

  if (files.length > 0) {
    console.log('\n🧠 Ingesting into GBrain...');
    execSync(`gbrain import ${GBRAIN_IMPORT_DIR} --source ${SOURCE_ID}`, { stdio: 'inherit' });
    execSync(`gbrain embed --all`, { stdio: 'inherit' });
    console.log('✅ GBrain ingestion complete.');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
