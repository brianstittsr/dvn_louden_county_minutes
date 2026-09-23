import { NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { processAllWikis, WikiDocument } from '@/lib/wiki-processor';
import * as fs from 'fs';
import * as path from 'path';

let cachedWikis: WikiDocument[] | null = null;
let cacheLoadTime = 0;
const CACHE_TTL = 10 * 60 * 1000;

function loadWikis(): WikiDocument[] {
  const now = Date.now();
  if (cachedWikis && (now - cacheLoadTime) < CACHE_TTL) {
    return cachedWikis;
  }

  const possiblePaths = [
    path.join(process.cwd(), 'wiki'),
    path.join(process.cwd(), '..', 'wiki'),
    path.join(process.cwd(), '.next', 'server', 'wiki'),
    '/var/task/wiki',
  ];

  let wikiDir = '';
  for (const tryPath of possiblePaths) {
    if (fs.existsSync(tryPath)) {
      wikiDir = tryPath;
      break;
    }
  }

  if (!wikiDir) {
    console.error('Could not find wiki directory in any location');
    cachedWikis = [];
    cacheLoadTime = now;
    return cachedWikis;
  }

  cachedWikis = processAllWikis(wikiDir);
  cacheLoadTime = now;
  console.log(`Loaded ${cachedWikis.length} wiki documents from ${wikiDir}`);
  return cachedWikis;
}

function searchWikis(wikis: WikiDocument[], query: string, limit: number = 5) {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

  const scored = wikis.map(wiki => {
    let score = 0;
    const searchable = `${wiki.title} ${wiki.summary} ${wiki.content} ${wiki.stakeholders.join(' ')} ${wiki.dataCenterProjects.join(' ')} ${wiki.environmentalConcerns.join(' ')} ${wiki.communityImpacts.join(' ')}`.toLowerCase();

    if (searchable.includes(queryLower)) {
      score += 10;
    }

    queryWords.forEach(word => {
      if (searchable.includes(word)) {
        score += 1;
        if (wiki.title.toLowerCase().includes(word)) score += 2;
        if (wiki.environmentalConcerns.some(c => c.toLowerCase().includes(word))) score += 2;
        if (wiki.communityImpacts.some(i => i.toLowerCase().includes(word))) score += 2;
        if (wiki.dataCenterProjects.some(p => p.toLowerCase().includes(word))) score += 2;
      }
    });

    return { wiki, score };
  });

  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.wiki);
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid messages format' },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1];
    const query = lastMessage.content;

    let wikis: WikiDocument[] = [];
    let context = '';

    try {
      wikis = loadWikis();
      const relevantWikis = searchWikis(wikis, query, 5);

      if (relevantWikis.length === 0) {
        console.log('No relevant wikis found for query:', query);
      }

      context = relevantWikis
        .map(wiki => {
          const content = wiki.content.slice(0, 3000);
          return `Page: ${wiki.title} (${wiki.category})\nURL: ${wiki.url}\nSummary: ${wiki.summary}\nEnvironmental concerns: ${wiki.environmentalConcerns.join(', ')}\nCommunity impacts: ${wiki.communityImpacts.join(', ')}\nData center projects: ${wiki.dataCenterProjects.join(', ')}\n\nContent:\n${content}`;
        })
        .join('\n\n---\n\n');
    } catch (wikiError) {
      console.error('Error loading wikis:', wikiError);
    }

    const systemPrompt = context
      ? `You are a helpful assistant that answers questions about Loudoun County, Virginia information related to data centers, with a focus on community and environmental impacts.

Here are relevant pages from the Loudoun County knowledge base to help answer the question:

${context}

Use the information above to answer the user's question. Be specific and cite which page and source URL you're referencing.

If the answer is not in the provided context, say so clearly.`
      : `You are a helpful assistant for Loudoun County, Virginia information related to data centers.

Note: The knowledge base is currently being updated. You can provide general information about how county governments typically handle data center developments, but specific Loudoun County details are not available at this moment.`;

    const result = streamText({
      model: openai('gpt-4o'),
      system: systemPrompt,
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Error in chat API:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { error: 'Failed to process chat request: ' + errorMessage },
      { status: 500 }
    );
  }
}
