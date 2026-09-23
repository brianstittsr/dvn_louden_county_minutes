import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { htmlToMarkdown } from './html-to-text';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  contentType?: string;
  department?: string;
  lastModified?: string;
}

export interface SearchScrapeOptions {
  searchPhrase: string;
  departmentId?: string;
  perPage?: number;
  maxPages?: number;
  delayMs?: number;
  userAgent?: string;
  baseUrl?: string;
  searchPath?: string;
}

export interface ScrapeResult {
  totalResults: number;
  pagesScraped: number;
  results: SearchResult[];
  errors: string[];
  savedPages: { url: string; filePath: string }[];
}

const DEFAULT_BASE_URL = 'https://www.loudoun.gov';
const DEFAULT_SEARCH_PATH = '/Search';

export async function scrapeLoudounSearch(options: SearchScrapeOptions): Promise<ScrapeResult> {
  const {
    searchPhrase,
    departmentId = '-1',
    perPage = 10,
    maxPages = 100,
    delayMs = 1000,
    userAgent = 'LoudounDataCenterResearchBot/1.0 (+https://example.com/bot-info)',
    baseUrl = DEFAULT_BASE_URL,
    searchPath = DEFAULT_SEARCH_PATH,
  } = options;

  const result: ScrapeResult = {
    totalResults: 0,
    pagesScraped: 0,
    results: [],
    errors: [],
    savedPages: [],
  };

  const dataDir = path.join(process.cwd(), 'data');
  const downloadsDir = path.join(process.cwd(), 'downloads', 'loudoun');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(downloadsDir, { recursive: true });

  const seenUrls = new Set<string>();

  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
    const searchUrl = `${baseUrl}${searchPath}?searchPhrase=${encodeURIComponent(searchPhrase)}&pageNumber=${pageNumber}&perPage=${perPage}&departmentId=${departmentId}`;
    console.log(`Fetching search page ${pageNumber}: ${searchUrl}`);

    try {
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': userAgent,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 30000,
      });

      const $ = cheerio.load(response.data);
      const pageResults = extractSearchResults($, baseUrl);

      if (pageResults.length === 0) {
        console.log(`No results on page ${pageNumber}; stopping pagination.`);
        break;
      }

      result.pagesScraped++;

      for (const searchResult of pageResults) {
        if (seenUrls.has(searchResult.url)) {
          console.log(`Skipping duplicate URL: ${searchResult.url}`);
          continue;
        }
        seenUrls.add(searchResult.url);
        result.results.push(searchResult);

        try {
          const pageResponse = await axios.get(searchResult.url, {
            headers: {
              'User-Agent': userAgent,
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            timeout: 30000,
          });

          const pageContent = htmlToMarkdown(pageResponse.data, searchResult.url);
          const safeFileName = urlToFileName(searchResult.url);
          const filePath = path.join(downloadsDir, `${safeFileName}.md`);
          fs.writeFileSync(filePath, `# ${pageContent.title}\n\n**Source:** ${searchResult.url}\n\n**Search snippet:** ${searchResult.snippet}\n\n---\n\n${pageContent.markdown}`);

          result.savedPages.push({ url: searchResult.url, filePath });
        } catch (pageError) {
          const message = `Failed to fetch page ${searchResult.url}: ${pageError instanceof Error ? pageError.message : String(pageError)}`;
          console.error(message);
          result.errors.push(message);
        }

        await delay(delayMs);
      }

      await delay(delayMs);
    } catch (searchError) {
      const message = `Failed to fetch search page ${pageNumber}: ${searchError instanceof Error ? searchError.message : String(searchError)}`;
      console.error(message);
      result.errors.push(message);
      break;
    }
  }

  result.totalResults = result.results.length;

  // Persist metadata
  const metadataPath = path.join(dataDir, 'loudoun-search-results.json');
  fs.writeFileSync(metadataPath, JSON.stringify(result, null, 2));

  return result;
}

function extractSearchResults($: cheerio.CheerioAPI, baseUrl: string): SearchResult[] {
  const results: SearchResult[] = [];

  // CivicPlus search results commonly appear in .search-result or .result-list items.
  // These selectors may need adjustment depending on the actual markup returned by the site.
  const resultSelectors = [
    '.search-result',
    '.result-item',
    '.search-results .result',
    '.cp-search-result',
    '.results-list li',
    '.search-results-list .item',
  ];

  let resultElements = $();
  for (const selector of resultSelectors) {
    resultElements = $(selector);
    if (resultElements.length > 0) break;
  }

  // Fallback: look for any heading/link near a snippet
  if (resultElements.length === 0) {
    resultElements = $('h2, h3, h4').filter((_, element) => {
      const link = $(element).find('a');
      return link.length > 0;
    });
  }

  resultElements.each((_, element) => {
    const el = $(element);
    const link = el.find('a').first();
    const href = link.attr('href');
    const title = link.text().trim();
    const snippet = el.find('.snippet, .summary, .description, p').first().text().trim();

    if (href && title) {
      results.push({
        title,
        url: resolveUrl(href, baseUrl),
        snippet: snippet || '',
      });
    }
  });

  return results;
}

function resolveUrl(url: string, baseUrl: string): string {
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  const base = new URL(baseUrl);
  if (url.startsWith('/')) return `${base.origin}${url}`;
  return `${base.origin}/${url}`;
}

function urlToFileName(url: string): string {
  const parsed = new URL(url);
  const pathname = parsed.pathname.replace(/\/$/, '') || 'index';
  const safe = pathname.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').toLowerCase();
  const hash = Buffer.from(url).toString('base64url').slice(0, 8);
  return `${safe}_${hash}`;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function loadSearchResults(): ScrapeResult | null {
  const metadataPath = path.join(process.cwd(), 'data', 'loudoun-search-results.json');
  if (!fs.existsSync(metadataPath)) return null;
  return JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
}
