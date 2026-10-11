import { NextResponse } from 'next/server';
import { z } from 'zod';
import { executeSyntheticWorkflow } from '@/lib/workflow-executor';

const RequestSchema = z.object({
  caseId: z.string().regex(/^CS-\d{4}$/),
  actionType: z.enum([
    'case_note',
    'diagnostic_request',
    'engineering_handoff',
    'csm_task',
    'incident_candidate',
    'entitlement_change',
    'credit',
    'credential_rotation',
    'delete_data',
    'billing_ownership',
  ]),
  confirmed: z.literal(true),
  idempotencyKey: z.string().regex(/^[A-Za-z0-9:_-]{8,160}$/),
}).strict();

export async function POST(request: Request) {
  try {
    const input = RequestSchema.parse(await request.json());
    return NextResponse.json(await executeSyntheticWorkflow(input));
  } catch {
    return NextResponse.json({ error: 'Invalid workflow execution request' }, { status: 400 });
  }
}
