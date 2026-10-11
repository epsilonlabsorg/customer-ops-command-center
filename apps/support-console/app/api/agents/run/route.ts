import { NextResponse } from 'next/server';
import { z } from 'zod';
import { customerOpsTopology, runCustomerOpsGraph } from '@/lib/agent-graph';

const RequestSchema = z.object({
  caseId: z.string().regex(/^CS-\d{4}$/),
  useModel: z.boolean().default(false),
}).strict();

export async function POST(request: Request) {
  try {
    const input = RequestSchema.parse(await request.json());
    const run = await runCustomerOpsGraph(input);
    return NextResponse.json({ ...run, topology: customerOpsTopology });
  } catch (error) {
    const message = error instanceof z.ZodError ? 'Invalid request' : 'Unknown case or inaccessible fixture';
    return NextResponse.json({ error: message }, { status: error instanceof z.ZodError ? 400 : 404 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'customer-operations-investigation',
    runtime: '@langchain/langgraph',
    persistence: 'request-scoped',
    topology: customerOpsTopology,
  });
}
