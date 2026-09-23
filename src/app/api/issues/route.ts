import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export interface WikiPage {
  id: string;
  title: string;
  category: string;
  url: string;
  summary: string;
  stakeholders: string[];
  environmentalConcerns: string[];
  communityImpacts: string[];
  dataCenterProjects: string[];
  wikiUrl: string;
}

export interface PagesByCategory {
  category: string;
  pages: WikiPage[];
}

let cachedPages: WikiPage[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

function extractField(content: string, heading: string): string {
  const regex = new RegExp(`## ${heading}\\n\\n([\\s\\S]+?)(?=\\n\\n## |$)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

function extractList(content: string, heading: string): string[] {
  const section = extractField(content, heading);
  return section
    .split('\n')
    .filter(line => line.startsWith('- '))
    .map(line => line.replace('- ', '').trim());
}

function extractPagesFromWikis(wikiDir: string): WikiPage[] {
  const pages: WikiPage[] = [];

  if (!fs.existsSync(wikiDir)) {
    console.log('Wiki directory does not exist:', wikiDir);
    return pages;
  }

  const categories = fs.readdirSync(wikiDir);

  for (const category of categories) {
    const categoryPath = path.join(wikiDir, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const files = fs.readdirSync(categoryPath);

    for (const file of files) {
      if (!file.endsWith('.md') || file === 'index.md') continue;

      try {
        const filePath = path.join(categoryPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        const titleMatch = content.match(/^# (.+)$/m);
        const urlMatch = content.match(/\*\*Source:\*\* \[([^\]]+)\]\(([^)]+)\)/);

        const title = titleMatch?.[1] || file.replace(/_/g, ' ').replace('.md', '');
        const url = urlMatch?.[2] || '';
        const summary = extractField(content, 'Summary');

        pages.push({
          id: `${category}-${file}`,
          title,
          category,
          url,
          summary: summary.slice(0, 300) + (summary.length > 300 ? '...' : ''),
          stakeholders: extractList(content, 'Stakeholders'),
          environmentalConcerns: extractList(content, 'Environmental Concerns'),
          communityImpacts: extractList(content, 'Community Impacts'),
          dataCenterProjects: extractList(content, 'Data Center Projects'),
          wikiUrl: `/wiki/${category}/${file}`,
        });
      } catch (fileError) {
        console.error(`Error processing file ${file}:`, fileError);
      }
    }
  }

  return pages.sort((a, b) => a.title.localeCompare(b.title));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const now = Date.now();
    if (!cachedPages || (now - cacheTimestamp) > CACHE_TTL) {
      const wikiDir = path.join(process.cwd(), 'wiki');
      cachedPages = extractPagesFromWikis(wikiDir);
      cacheTimestamp = now;
    }

    let pages = cachedPages || [];

    if (category) {
      pages = pages.filter(page => page.category === category);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      pages = pages.filter(page =>
        page.title.toLowerCase().includes(searchLower) ||
        page.summary.toLowerCase().includes(searchLower) ||
        page.environmentalConcerns.some(c => c.toLowerCase().includes(searchLower)) ||
        page.communityImpacts.some(i => i.toLowerCase().includes(searchLower))
      );
    }

    const categories = Array.from(new Set(pages.map(p => p.category))).sort();

    const pagesByCategory: PagesByCategory[] = categories.map(c => ({
      category: c,
      pages: pages.filter(p => p.category === c),
    }));

    return NextResponse.json({
      success: true,
      totalPages: pages.length,
      categories,
      pagesByCategory,
      pages,
    });
  } catch (error) {
    console.error('Error fetching pages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pages: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
