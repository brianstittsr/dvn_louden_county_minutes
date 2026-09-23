import * as dotenv from 'dotenv';
import { scrapeLoudounSearch } from '../src/lib/scrapers/loudoun-search.js';

dotenv.config({ path: '.env.local' });

async function main() {
  const searchPhrase = process.argv.find(arg => arg.startsWith('--phrase='))?.replace('--phrase=', '') || 'DATA CENTER';
  const maxPages = parseInt(process.argv.find(arg => arg.startsWith('--max-pages='))?.replace('--max-pages=', '') || '100', 10);
  const delayMs = parseInt(process.argv.find(arg => arg.startsWith('--delay='))?.replace('--delay=', '') || '1000', 10);

  console.log(`🔍 Scraping Loudoun County search results for: "${searchPhrase}"`);
  console.log(`   Max pages: ${maxPages}`);
  console.log(`   Delay: ${delayMs}ms\n`);

  const result = await scrapeLoudounSearch({
    searchPhrase,
    maxPages,
    delayMs,
  });

  console.log('\n✅ Scraping complete');
  console.log(`   Total results: ${result.totalResults}`);
  console.log(`   Pages scraped: ${result.pagesScraped}`);
  console.log(`   Saved pages: ${result.savedPages.length}`);

  if (result.errors.length > 0) {
    console.log(`\n⚠️ Errors (${result.errors.length}):`);
    result.errors.forEach(err => console.log(`   - ${err}`));
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
