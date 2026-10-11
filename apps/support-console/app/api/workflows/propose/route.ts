import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateWorkflow } from '@/lib/policy';

const RequestSchema = z.object({
  caseId: z.string().regex(/^CS-\d{4}$/),
  actionType: z.enum(['case_note','diagnostic_request','engineering_handoff','csm_task','incident_candidate','entitlement_change','credit','credential_rotation','delete_data','billing_ownership']),
}).strict();

export async function POST(request: Request) {
  try {
    const input = RequestSchema.parse(await request.json());
    const policy = evaluateWorkflow({
      actionType: input.actionType,
      authenticated: false,
      authorized: false,
      approved: false,
      actionDigestMatches: false,
    });
    return NextResponse.json({
      synthetic: true,
      executed: false,
      caseId: input.caseId,
      actionType: input.actionType,
      policy,
      message: 'Demo mode can preview policy decisions but cannot write or execute workflow actions.',
    });
  } catch {
    return NextResponse.json({ error: 'Invalid workflow proposal' }, { status: 400 });
  }
}
