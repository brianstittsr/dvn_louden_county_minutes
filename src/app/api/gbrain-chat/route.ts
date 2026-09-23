import { NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface GBrainResult {
  title?: string;
  slug?: string;
  content?: string;
  url?: string;
}

const GBRAIN_IMPORT_DIR = path.join(process.cwd(), 'gbrain', 'import');

function findGBrain(): string {
  if (process.env.GBRAIN_PATH) return process.env.GBRAIN_PATH;

  const candidates = [
    path.join(os.homedir(), '.bun', 'bin', 'gbrain'),
    path.join(os.homedir(), '.bun', 'bin', 'gbrain.exe'),
    'gbrain',
  ];

  for (const candidate of candidates) {
    if (candidate === 'gbrain') return candidate;
    if (fs.existsSync(candidate)) return candidate;
  }

  return 'gbrain';
}

const GBRAIN = findGBrain();

function extractSourceUrl(content: string): string {
  const match = content.match(/\*\*Source:\*\*\s*\[([^\]]+)\]/);
  return match ? match[1] : '';
}

function readPageContent(slug: string): string {
  try {
    const filePath = path.join(GBRAIN_IMPORT_DIR, `${slug}.md`);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch (error) {
    console.error(`Failed to read page ${slug}:`, error);
  }
  return '';
}

function queryGBrain(question: string, sources: string[], limit: number): GBrainResult[] {
  const sourceArgs = sources.length > 0 ? sources.map(s => `--source-id ${s}`).join(' ') : '';
  const command = `"${GBRAIN}" query ${JSON.stringify(question)} --limit ${limit} --detail medium ${sourceArgs}`;

  try {
    const output = execSync(command, { encoding: 'utf-8', timeout: 60000 });
    const lines = output.split('\n').filter(line => line.trim().length > 0);
    const results: GBrainResult[] = [];
    const seenSlugs = new Set<string>();

    for (const line of lines) {
      const match = line.match(/^\[([\d.]+)\]\s+(\S+)\s+--\s+(.*)$/);
      if (!match) continue;

      const slug = match[2];
      if (seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);

      const fullContent = readPageContent(slug);
      const titleMatch = fullContent.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : slug;
      const url = extractSourceUrl(fullContent);

      results.push({
        title,
        slug,
        content: fullContent || match[3],
        url,
      });

      if (results.length >= limit) break;
    }

    return results;
  } catch (error) {
    console.error('GBrain query failed:', error);
    return [];
  }
}

function listGBrainSources(): string[] {
  try {
    const output = execSync(`"${GBRAIN}" sources list`, { encoding: 'utf-8', timeout: 30000 });
    return output
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('-') && !line.startsWith('SOURCES'))
      .map(line => line.split(/\s+/)[0])
      .filter(sourceId => sourceId.length > 0);
  } catch (error) {
    console.error('Failed to list GBrain sources:', error);
    return [];
  }
}

export async function POST(req: Request) {
  try {
    const { messages, sources, limit = 10 } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid messages format' },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1];
    const question = lastMessage?.content || '';

    if (!question) {
      return NextResponse.json(
        { error: 'No question provided' },
        { status: 400 }
      );
    }

    const availableSources = listGBrainSources();
    const selectedSources = sources && Array.isArray(sources) && sources.length > 0
      ? sources.filter((s: string) => availableSources.includes(s))
      : availableSources;

    const gbrainResults = queryGBrain(question, selectedSources, limit);

    const context = gbrainResults.length > 0
      ? gbrainResults.map((result, index) => {
          const title = result.title || result.slug || 'Untitled';
          const url = result.url ? ` (${result.url})` : '';
          return `[${index + 1}] ${title}${url}\n${result.content?.slice(0, 2000) || ''}`;
        }).join('\n\n---\n\n')
      : 'No relevant pages found in GBrain for this question.';

    const systemPrompt = `You are a helpful assistant that answers questions about Loudoun County, Virginia, using the retrieved GBrain knowledge graph context.

Retrieved GBrain pages:

${context}

Use the information above to answer the user's question. Be specific and cite which page/source you're referencing.

If the answer is not in the provided context, say so clearly.`;

    const result = streamText({
      model: openai('gpt-4o'),
      system: systemPrompt,
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Error in GBrain chat API:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { error: 'Failed to process GBrain chat request: ' + errorMessage },
      { status: 500 }
    );
  }
}
