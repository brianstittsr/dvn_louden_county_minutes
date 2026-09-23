import * as dotenv from 'dotenv';
import { generateLoudounWikis, getWikiStats } from '../src/lib/wiki-generator-loudoun.js';

dotenv.config({ path: '.env.local' });

async function main() {
  console.log('📝 Loudoun County Data Center Wiki Generator\n');

  const stats = getWikiStats();
  console.log('Current Status:');
  console.log(`  Total files processed: ${stats.totalFiles}`);
  console.log(`  Total topics: ${stats.totalTopics}`);
  console.log(`  Last run: ${stats.lastRun || 'Never'}\n`);

  console.log('Processing new Loudoun pages...\n');

  const result = await generateLoudounWikis();

  console.log('\n✅ Done!');
  console.log(`  Processed: ${result.processed} new file(s)`);

  if (result.newFiles.length > 0) {
    console.log('\n  New files found:');
    result.newFiles.forEach(file => {
      console.log(`    - ${file}`);
    });
  }

  if (result.errors.length > 0) {
    console.log('\n  Errors:');
    result.errors.forEach(err => console.log(`    ⚠️ ${err}`));
  }

  const newStats = getWikiStats();
  console.log('\n📊 Updated Status:');
  console.log(`  Total files processed: ${newStats.totalFiles}`);
  console.log(`  Total topics: ${newStats.totalTopics}`);
  console.log(`  Last run: ${newStats.lastRun}`);

  console.log('\n🌐 Wiki available at: ./wiki/index.md');
}

main().catch(console.error);
