Common Services
===============

This document describes the shared infrastructure services provided by the repository and how to use them.

Location
--------

- Shared implementations: `src/common/services/*`
- Module: `src/common/services.module.ts` (exports common services via `CommonServicesModule`)

Provided Services
-----------------

- AI: `src/common/services/ai/gemini.service.ts`
  - Purpose: OCR extraction, prompt-based parsing for fund prices and certificates.
  - Prompts live under `src/common/services/ai/prompts/`.

- Storage: `src/common/services/storage/supabase-storage.service.ts`
  - Purpose: Upload images and provide signed URLs for clients (Telegram upload flow uses this).
  - Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables.

- Messaging (HTTP): `src/common/services/messaging/upstash-qstash.service.ts`
  - Purpose: Send signed HTTP callback messages via Upstash QStash.
  - Requires `QSTASH_SIGNING_KEY` / appropriate env configuration used by the service.

Usage
-----

1. Import `CommonServicesModule` in your `AppModule` (it's already registered for most setups):

```ts
import { CommonServicesModule } from './common/services.module';

@Module({
  imports: [CommonServicesModule, /* other modules */],
})
export class AppModule {}
```

2. Inject the required service into your module/service via constructor injection:

```ts
constructor(private readonly supabase: SupabaseStorageService) {}
```

3. For client-specific needs (e.g., Telegram), use thin wrappers under `src/telegram/services/` that adapt common services to the client's message formats.

Adding New Shared Services
--------------------------

1. Implement the service under `src/common/services/<area>/`.
2. Register it in `CommonServicesModule` providers and exports.
3. Update `docs/COMMON_SERVICES.md` and any client docs (e.g., `docs/TELEGRAM_BOT_SETUP.md`).

Verification
------------

- Run `npm run typecheck` and `npm run lint` after adding code.
- Build and run the app locally to verify runtime wiring: `npm run build && npm run start:dev`.

Contact
-------

If you're unsure where to place a piece of infra, ask in the team or open a short PR describing the intended scope.
