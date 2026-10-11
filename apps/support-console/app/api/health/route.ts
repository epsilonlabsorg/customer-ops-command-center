import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    mode: 'synthetic_demo',
    integrations: {
      ollama: Boolean(process.env.OLLAMA_API_KEY),
      ollamaModel: process.env.OLLAMA_MODEL || 'gpt-oss:20b-cloud',
      supabase: Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)),
    },
    dataBoundary: 'Public knowledge and synthetic customer data only',
  });
}
