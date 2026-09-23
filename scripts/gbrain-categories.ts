import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

function runCommand(command: string): string {
  try {
    return execSync(command, { encoding: 'utf-8', timeout: 60000 });
  } catch (error) {
    console.error(`Command failed: ${command}`);
    return '';
  }
}

function main() {
  console.log('📊 GBrain Category Report\n');

  console.log('Sources:');
  console.log(runCommand('gbrain sources list'));

  console.log('\nStats:');
  console.log(runCommand('gbrain stats'));

  console.log('\nTags:');
  // Tags are per-page; list pages and aggregate tags if needed
  const pagesOutput = runCommand('gbrain list --json');
  let pages: any[] = [];
  if (pagesOutput && pagesOutput.trim().startsWith('[')) {
    try {
      pages = JSON.parse(pagesOutput);
    } catch {
      pages = [];
    }
  }

  const typeCounts = new Map<string, number>();
  for (const page of pages) {
    const type = page.page_type || page.type || 'unknown';
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
  }

  console.log('\nPage Types:');
  for (const [type, count] of Array.from(typeCounts.entries())) {
    console.log(`  ${type}: ${count}`);
  }

  const outputPath = path.join(process.cwd(), 'gbrain', 'CATEGORIES.md');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const markdown = `# GBrain Categories\n\nGenerated: ${new Date().toISOString()}\n\n## Sources\n\n${runCommand('gbrain sources list')}\n\n## Stats\n\n\`\`\`\n${runCommand('gbrain stats')}\n\`\`\`\n\n## Page Types\n\n${Array.from(typeCounts.entries()).map(([type, count]) => `- **${type}**: ${count}`).join('\n') || '_No pages ingested yet_'}\n\n## Expected Categories for Loudoun County Data\n\nOnce data is ingested, GBrain will organize pages by:\n\n- **Source**: \`loudoun-data-center-search\`, \`loudoun-site\`\n- **Page types**: \`webpage\`, \`note\`, \`article\` (set via frontmatter or capture type)\n- **Entity types**: people, organizations, places, projects, events\n- **Link types**: \`related_to\`, \`mentions\`, \`works_at\`, \`founded\`, etc.\n\nRun \`gbrain link-sources\` after ingestion to review extracted link provenances.\n`;

  fs.writeFileSync(outputPath, markdown);
  console.log(`\n📝 Category report saved to ${outputPath}`);
}

main();
