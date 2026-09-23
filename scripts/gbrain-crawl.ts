import axios from 'axios';
import * as cheerio from 'cheerio';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';
import { htmlToMarkdown } from '../src/lib/scrapers/html-to-text.js';

const BASE_URL = 'https://www.loudoun.gov';
const OUTPUT_DIR = path.join(process.cwd(), 'downloads', 'loudoun-site');
const SOURCE_ID = 'loudoun-site';
const MAX_PAGES = 1000;
const DELAY_MS = 1000;

interface RobotsRule {
  userAgent: string;
  disallow: string[];
  crawlDelay?: number;
}

function parseRobotsTxt(content: string): RobotsRule[] {
  const rules: RobotsRule[] = [];
  let currentRule: RobotsRule | null = null;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const [key, ...valueParts] = trimmed.split(':');
    const value = valueParts.join(':').trim();

    if (key.toLowerCase() === 'user-agent') {
      if (currentRule) rules.push(currentRule);
      currentRule = { userAgent: value, disallow: [] };
    } else if (key.toLowerCase() === 'disallow' && currentRule) {
      currentRule.disallow.push(value);
    } else if (key.toLowerCase() === 'crawl-delay' && currentRule) {
      currentRule.crawlDelay = parseFloat(value);
    }
  }

  if (currentRule) rules.push(currentRule);
  return rules;
}

async function fetchRobotsTxt(): Promise<RobotsRule[]> {
  try {
    const response = await axios.get(`${BASE_URL}/robots.txt`, { timeout: 10000 });
    return parseRobotsTxt(response.data);
  } catch (error) {
    console.warn('Could not fetch robots.txt:', error);
    return [];
  }
}

function isAllowed(urlPath: string, rules: RobotsRule[]): boolean {
  const userAgentRules = rules.filter(r => r.userAgent === '*' || r.userAgent.toLowerCase() === 'loundoundatacenterresearchbot/1.0');
  for (const rule of userAgentRules) {
    for (const disallowed of rule.disallow) {
      if (urlPath.startsWith(disallowed)) {
        return false;
      }
    }
  }
  return true;
}

function getCrawlDelay(rules: RobotsRule[]): number {
  const userAgentRules = rules.filter(r => r.userAgent === '*' || r.userAgent.toLowerCase() === 'loundoundatacenterresearchbot/1.0');
  for (const rule of userAgentRules) {
    if (rule.crawlDelay && !isNaN(rule.crawlDelay)) {
      return rule.crawlDelay * 1000;
    }
  }
  return DELAY_MS;
}

function urlToFilePath(urlStr: string): string {
  const parsed = new URL(urlStr);
  const pathname = parsed.pathname.replace(/\/$/, '') || 'index';
  const safe = pathname.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').toLowerCase();
  const hash = Buffer.from(urlStr).toString('base64url').slice(0, 8);
  return path.join(OUTPUT_DIR, `${safe}_${hash}.md`);
}

function extractLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];

  $('a').each((_, element) => {
    const href = $(element).attr('href');
    if (!href) return;

    try {
      const url = new URL(href, baseUrl);
      if (url.origin === new URL(baseUrl).origin) {
        links.push(url.href.split('#')[0]);
      }
    } catch {
      // ignore invalid URLs
    }
  });

  return Array.from(new Set(links));
}

function ensureSource(sourceId: string, sourcePath: string) {
  try {
    const sources = execSync('gbrain sources list', { encoding: 'utf-8' });
    if (sources.includes(sourceId)) {
      console.log(`Source ${sourceId} already registered.`);
      return;
    }
  } catch {
    // ignore
  }

  execSync(`gbrain sources add ${sourceId} --path ${sourcePath}`, { stdio: 'inherit' });
}

async function crawl(startUrls: string[], maxPages: number) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const rules = await fetchRobotsTxt();
  const crawlDelay = getCrawlDelay(rules);
  const visited = new Set<string>();
  const queue: string[] = [...startUrls];
  const savedFiles: string[] = [];

  while (queue.length > 0 && visited.size < maxPages) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;

    const parsed = new URL(url);
    if (!isAllowed(parsed.pathname, rules)) {
      console.log(`Disallowed by robots.txt: ${url}`);
      continue;
    }

    visited.add(url);
    console.log(`Crawling ${url}`);

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'LoudounDataCenterResearchBot/1.0 (+https://example.com/bot-info)',
        },
        timeout: 30000,
      });

      const pageContent = htmlToMarkdown(response.data, url);
      const filePath = urlToFilePath(url);
      fs.writeFileSync(filePath, `# ${pageContent.title}\n\n**Source:** [${url}](${url})\n\n---\n\n${pageContent.markdown}`);
      savedFiles.push(filePath);

      const links = extractLinks(response.data, url);
      for (const link of links) {
        if (!visited.has(link)) {
          queue.push(link);
        }
      }
    } catch (error) {
      console.error(`Failed to crawl ${url}:`, error);
    }

    await new Promise(resolve => setTimeout(resolve, crawlDelay));
  }

  console.log(`\n✅ Crawled ${visited.size} pages, saved ${savedFiles.length} markdown files to ${OUTPUT_DIR}`);

  if (savedFiles.length > 0) {
    ensureSource(SOURCE_ID, OUTPUT_DIR);
    console.log('\n🧠 Importing into GBrain...');
    execSync(`gbrain import ${OUTPUT_DIR} --source ${SOURCE_ID}`, { stdio: 'inherit' });
    console.log('\n🔍 Extracting links and timeline...');
    execSync(`gbrain extract all --source ${SOURCE_ID}`, { stdio: 'inherit' });
    console.log('\n🧮 Computing embeddings...');
    execSync(`gbrain embed --all --source ${SOURCE_ID}`, { stdio: 'inherit' });
    console.log('\n✅ GBrain crawl ingestion complete.');
  }
}

async function main() {
  const maxPages = parseInt(process.argv.find(arg => arg.startsWith('--max-pages='))?.replace('--max-pages=', '') || String(MAX_PAGES), 10);

  console.log(`🕷️ Starting respectful crawl of ${BASE_URL}`);
  console.log(`   Max pages: ${maxPages}`);
  console.log(`   Output: ${OUTPUT_DIR}`);
  console.log('   Note: This script respects robots.txt. The /Search path is disallowed and will be skipped.\n');

  await crawl([BASE_URL], maxPages);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
