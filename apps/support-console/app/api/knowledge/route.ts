import { NextResponse } from 'next/server';
import { searchKnowledge } from '@/lib/knowledge';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get('q') ?? '').slice(0, 200);
  const product = (url.searchParams.get('product') ?? '').slice(0, 40);
  return NextResponse.json({
    snapshot: '2026-09-12',
    mode: 'curated_keyword',
    results: searchKnowledge(query, product || undefined).slice(0, 20),
  });
}
