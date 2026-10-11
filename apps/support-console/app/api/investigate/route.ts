import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runCustomerOpsGraph } from '@/lib/agent-graph';

const RequestSchema = z.object({
  caseId: z.string().regex(/^CS-\d{4}$/),
  useModel: z.boolean().default(true),
}).strict();

export async function POST(request: Request) {
  let input: z.infer<typeof RequestSchema>;
  try {
    input = RequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    return NextResponse.json(await runCustomerOpsGraph(input));
  } catch {
    return NextResponse.json({ error: 'Unknown case or inaccessible fixture' }, { status: 404 });
  }
}
