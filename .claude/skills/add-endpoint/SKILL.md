---
name: add-endpoint
description: Adds or changes an HTTP endpoint in nuoilon-be. Use when creating a route, controller method, webhook, or QStash callback.
---

1. Place it in the module that owns the caller: `appscripts/` (Google Apps Script), `telegram/` (bot, OCR callbacks), `web/`, `report/`, `crypto/`. The route becomes `/api/v1/<module>/<path>`.
2. Pick the guard from the auth table in `AGENTS.md`. Debug or test-only endpoints take `DisableInProductionGuard`. Add the matching `@ApiSecurity('HMAC-Signature')` or `@ApiSecurity('Upstash-Signature')`.
3. Input is a DTO in `<module>/dto/` with `class-validator` rules and `@ApiProperty` on every field. Document the route with `@ApiOperation` and one `@ApiResponse` per status it returns.
4. Keep the controller thin: it calls a service; the service calls a repository in `<module>/repositories/`.
5. Tests:
   - unit spec next to the service for its logic
   - if the route has a guard, an e2e boundary test in `test/<name>.e2e-spec.ts` covering accepted and rejected signatures (pattern: `test/appscripts-hmac.e2e-spec.ts`; the test module holds only the controller and mocked services)
6. Run `npm run docs:generate` (output is gitignored; CI regenerates it on deploy).

Done when `npm run lint`, `npm run build`, `npm test`, and `npm run test:e2e` pass and the route appears in the locally generated `docs/openapi-*.json`.
