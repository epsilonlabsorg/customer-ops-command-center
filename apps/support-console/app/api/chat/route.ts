import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runSupportChat } from '@/lib/chat';

const RequestSchema = z.object({
  caseId: z.string().regex(/^CS-\d{4}$/),
  message: z.string().trim().min(1).max(800),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(4000),
  }).strict()).max(6).default([]),
}).strict();

export async function POST(request: Request) {
  let input: z.infer<typeof RequestSchema>;
  try {
    input = RequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid chat request' }, { status: 400 });
  }

  try {
    return NextResponse.json(await runSupportChat(input));
  } catch {
    return NextResponse.json({ error: 'Unknown case or inaccessible fixture' }, { status: 404 });
  }
}
