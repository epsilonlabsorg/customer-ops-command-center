# Threat Model

## Key Risks

- Cross-tenant data leakage
- Prompt injection from ticket text or retrieved public content
- Sensitive token exposure
- Privilege escalation through workflow tools
- Hallucinated incidents or unsupported claims
- Unsafe remediation actions
- Bulk extraction of customer data

## Controls

- Tenant scope enforced in every backend query
- Role and entitlement checks outside the model
- Retrieved content treated as evidence, not instructions
- Redaction before model calls and logs
- Typed tool schemas with allowlisted actions
- Human approval for high-risk actions
- Audit logs for customer-data access and workflow execution
