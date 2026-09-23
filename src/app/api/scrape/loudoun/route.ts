import { NextResponse } from 'next/server';
import { scrapeLoudounSearch } from '@/lib/scrapers/loudoun-search';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const result = await scrapeLoudounSearch({
      searchPhrase: body.searchPhrase || 'DATA CENTER',
      departmentId: body.departmentId || '-1',
      perPage: body.perPage || 10,
      maxPages: body.maxPages || 100,
      delayMs: body.delayMs || 1000,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error scraping Loudoun search:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
