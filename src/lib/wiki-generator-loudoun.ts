import * as fs from 'fs';
import * as path from 'path';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

const WIKI_DIR = path.join(process.cwd(), 'wiki');
const WIKI_INDEX_FILE = path.join(WIKI_DIR, 'index.md');
const WIKI_TRACKING_FILE = path.join(process.cwd(), 'wiki-processed.json');
const DOWNLOADS_DIR = path.join(process.cwd(), 'downloads', 'loudoun');

export interface LoudounPage {
  title: string;
  url: string;
  snippet: string;
  filePath: string;
}

interface ProcessedWiki {
  filePath: string;
  processedAt: string;
  wikiPath: string;
}

interface WikiTracking {
  processedFiles: ProcessedWiki[];
  lastRun: string;
}

export interface PageAnalysis {
  title: string;
  url: string;
  summary: string;
  keyFacts: string[];
  stakeholders: string[];
  environmentalConcerns: string[];
  communityImpacts: string[];
  relatedTopics: string[];
  dataCenterProjects: string[];
  actionItems: string[];
}

function loadWikiTracking(): WikiTracking {
  try {
    if (fs.existsSync(WIKI_TRACKING_FILE)) {
      const data = fs.readFileSync(WIKI_TRACKING_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading wiki tracking:', error);
  }
  return { processedFiles: [], lastRun: '' };
}

function saveWikiTracking(tracking: WikiTracking) {
  try {
    fs.writeFileSync(WIKI_TRACKING_FILE, JSON.stringify(tracking, null, 2));
  } catch (error) {
    console.error('Error saving wiki tracking:', error);
  }
}

function getNewPages(tracking: WikiTracking): LoudounPage[] {
  const metadataPath = path.join(process.cwd(), 'data', 'loudoun-search-results.json');
  if (!fs.existsSync(metadataPath)) {
    console.log('No search results metadata found. Run `npm run scrape` first.');
    return [];
  }

  const result = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  const allPages: LoudounPage[] = result.savedPages.map((saved: { url: string; filePath: string }) => {
    const content = fs.readFileSync(saved.filePath, 'utf-8');
    const titleMatch = content.match(/^# (.+)$/m);
    const snippetMatch = content.match(/\*\*Search snippet:\*\* (.+)$/m);
    return {
      title: titleMatch?.[1] || 'Untitled',
      url: saved.url,
      snippet: snippetMatch?.[1] || '',
      filePath: saved.filePath,
    };
  });

  const processedPaths = new Set(tracking.processedFiles.map(p => p.filePath));
  return allPages.filter(page => !processedPaths.has(page.filePath));
}

async function analyzePage(page: LoudounPage): Promise<PageAnalysis> {
  const content = fs.readFileSync(page.filePath, 'utf-8');
  const bodyText = content.replace(/^# .+\n\n/, '').slice(0, 15000);

  const prompt = `Analyze this Loudoun County web page about data centers and extract key information relevant to community and environmental concerns.

Page Title: ${page.title}
URL: ${page.url}

Content:
${bodyText}

Extract and format the following as JSON:
{
  "title": "short descriptive title",
  "summary": "2-3 paragraph executive summary focusing on data center relevance",
  "keyFacts": ["key facts and figures"],
  "stakeholders": ["people, departments, companies, or organizations mentioned"],
  "environmentalConcerns": ["environmental issues such as power, water, noise, emissions, habitat"],
  "communityImpacts": ["community impacts such as traffic, jobs, taxes, quality of life"],
  "relatedTopics": ["related topics for cross-linking"],
  "dataCenterProjects": ["specific data center projects, sites, or developments mentioned"],
  "actionItems": ["public hearings, votes, permits, studies, or next steps mentioned"]
}

Be concise but comprehensive. If information isn't available, use empty arrays or "Not specified".`;

  try {
    const { text } = await generateText({
      model: openai('gpt-4o'),
      prompt,
      temperature: 0.3,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as PageAnalysis;
    }
  } catch (error) {
    console.error(`Error analyzing ${page.url}:`, error);
  }

  return {
    title: page.title,
    url: page.url,
    summary: 'Analysis failed. Please review original page.',
    keyFacts: [],
    stakeholders: [],
    environmentalConcerns: [],
    communityImpacts: [],
    relatedTopics: [],
    dataCenterProjects: [],
    actionItems: [],
  };
}

function generatePageWiki(analysis: PageAnalysis): string {
  let markdown = `# ${analysis.title}\n\n`;
  markdown += `**Source:** [${analysis.url}](${analysis.url})  \n`;
  markdown += `**Last analyzed:** ${new Date().toISOString()}\n\n`;

  markdown += `## Summary\n\n${analysis.summary}\n\n`;

  if (analysis.dataCenterProjects.length > 0) {
    markdown += `## Data Center Projects\n\n`;
    analysis.dataCenterProjects.forEach(project => {
      markdown += `- ${project}\n`;
    });
    markdown += `\n`;
  }

  if (analysis.environmentalConcerns.length > 0) {
    markdown += `## Environmental Concerns\n\n`;
    analysis.environmentalConcerns.forEach(concern => {
      markdown += `- ${concern}\n`;
    });
    markdown += `\n`;
  }

  if (analysis.communityImpacts.length > 0) {
    markdown += `## Community Impacts\n\n`;
    analysis.communityImpacts.forEach(impact => {
      markdown += `- ${impact}\n`;
    });
    markdown += `\n`;
  }

  if (analysis.stakeholders.length > 0) {
    markdown += `## Stakeholders\n\n`;
    analysis.stakeholders.forEach(stakeholder => {
      markdown += `- ${stakeholder}\n`;
    });
    markdown += `\n`;
  }

  if (analysis.actionItems.length > 0) {
    markdown += `## Action Items & Next Steps\n\n`;
    analysis.actionItems.forEach(item => {
      markdown += `- [ ] ${item}\n`;
    });
    markdown += `\n`;
  }

  if (analysis.keyFacts.length > 0) {
    markdown += `## Key Facts\n\n`;
    analysis.keyFacts.forEach(fact => {
      markdown += `- ${fact}\n`;
    });
    markdown += `\n`;
  }

  if (analysis.relatedTopics.length > 0) {
    markdown += `## Related Topics\n\n`;
    analysis.relatedTopics.forEach(topic => {
      markdown += `- ${topic}\n`;
    });
    markdown += `\n`;
  }

  markdown += `---\n\n`;
  markdown += `[← Back to Data Center Index](./index.md)  \n`;
  markdown += `[← Main Wiki Index](../index.md)\n`;

  return markdown;
}

function generateTopicIndex(analyses: PageAnalysis[]): string {
  let markdown = `# Loudoun County Data Center Knowledge Base\n\n`;
  markdown += `AI-generated summaries of Loudoun County web pages related to data centers, with a focus on community and environmental impacts.\n\n`;

  markdown += `## Pages\n\n`;
  analyses.forEach(analysis => {
    const slug = urlToSlug(analysis.url);
    markdown += `- [${analysis.title}](./${slug}.md) — ${analysis.summary.slice(0, 120).replace(/\n/g, ' ')}...\n`;
  });

  markdown += `\n## Themes\n\n`;

  const allEnvironmental = analyses.flatMap(a => a.environmentalConcerns);
  const allCommunity = analyses.flatMap(a => a.communityImpacts);
  const allProjects = analyses.flatMap(a => a.dataCenterProjects);

  if (allEnvironmental.length > 0) {
    markdown += `### Environmental Concerns\n\n`;
    Array.from(new Set(allEnvironmental)).slice(0, 20).forEach(concern => {
      markdown += `- ${concern}\n`;
    });
    markdown += `\n`;
  }

  if (allCommunity.length > 0) {
    markdown += `### Community Impacts\n\n`;
    Array.from(new Set(allCommunity)).slice(0, 20).forEach(impact => {
      markdown += `- ${impact}\n`;
    });
    markdown += `\n`;
  }

  if (allProjects.length > 0) {
    markdown += `### Data Center Projects\n\n`;
    Array.from(new Set(allProjects)).slice(0, 20).forEach(project => {
      markdown += `- ${project}\n`;
    });
    markdown += `\n`;
  }

  markdown += `---\n\n`;
  markdown += `[← Main Wiki Index](../index.md)\n`;

  return markdown;
}

function generateMainIndex(): string {
  let markdown = `# Loudoun County Wiki\n\n`;
  markdown += `AI-generated knowledge base of Loudoun County, Virginia government information.\n\n`;
  markdown += `## Topics\n\n`;
  markdown += `- [Data Centers](./data-center/index.md)\n`;
  markdown += `\n---\n\n`;
  markdown += `*Generated from public Loudoun County web pages.*\n`;
  return markdown;
}

function urlToSlug(url: string): string {
  const parsed = new URL(url);
  const pathname = parsed.pathname.replace(/\/$/, '') || 'index';
  const safe = pathname.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').toLowerCase();
  const hash = Buffer.from(url).toString('base64url').slice(0, 8);
  return `${safe}_${hash}`;
}

export async function generateLoudounWikis(): Promise<{
  processed: number;
  newFiles: string[];
  errors: string[];
}> {
  if (!fs.existsSync(WIKI_DIR)) {
    fs.mkdirSync(WIKI_DIR, { recursive: true });
  }

  const dataCenterDir = path.join(WIKI_DIR, 'data-center');
  if (!fs.existsSync(dataCenterDir)) {
    fs.mkdirSync(dataCenterDir, { recursive: true });
  }

  const tracking = loadWikiTracking();
  const newPages = getNewPages(tracking);

  if (newPages.length === 0) {
    return { processed: 0, newFiles: [], errors: [] };
  }

  const errors: string[] = [];
  const analyses: PageAnalysis[] = [];

  for (const page of newPages) {
    try {
      console.log(`Analyzing: ${page.url}`);
      const analysis = await analyzePage(page);
      analysis.url = page.url;
      analyses.push(analysis);

      const slug = urlToSlug(page.url);
      const wikiPath = path.join(dataCenterDir, `${slug}.md`);
      const markdown = generatePageWiki(analysis);
      fs.writeFileSync(wikiPath, markdown);

      tracking.processedFiles.push({
        filePath: page.filePath,
        processedAt: new Date().toISOString(),
        wikiPath: path.relative(process.cwd(), wikiPath),
      });
    } catch (error) {
      const message = `Error processing ${page.url}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(message);
      errors.push(message);
    }
  }

  if (analyses.length > 0) {
    const topicIndex = generateTopicIndex(analyses);
    fs.writeFileSync(path.join(dataCenterDir, 'index.md'), topicIndex);

    const mainIndex = generateMainIndex();
    fs.writeFileSync(WIKI_INDEX_FILE, mainIndex);
  }

  tracking.lastRun = new Date().toISOString();
  saveWikiTracking(tracking);

  return {
    processed: analyses.length,
    newFiles: analyses.map(a => a.url),
    errors,
  };
}

export function getWikiStats(): {
  totalFiles: number;
  totalTopics: number;
  lastRun: string;
} {
  const tracking = loadWikiTracking();

  let totalTopics = 0;
  if (fs.existsSync(WIKI_DIR)) {
    totalTopics = fs.readdirSync(WIKI_DIR).filter(f => {
      const stat = fs.statSync(path.join(WIKI_DIR, f));
      return stat.isDirectory();
    }).length;
  }

  return {
    totalFiles: tracking.processedFiles.length,
    totalTopics,
    lastRun: tracking.lastRun,
  };
}
