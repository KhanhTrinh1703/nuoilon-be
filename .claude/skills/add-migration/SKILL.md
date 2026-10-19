---
name: add-migration
description: Adds a TypeORM schema change to nuoilon-be. Use when adding or changing an entity, column, index, table, or Postgres trigger/function.
---

Migrations are the only path to a schema change; merging to `main` runs `migration:run` against production before deploy.

1. Edit or add the entity in `src/database/entities/`. Register a new entity with `TypeOrmModule.forFeature([...])` in each module that uses it.
2. With a local Postgres at the current schema (`npm run migration:run` first), generate:
   `npm run migration:generate -- src/database/migrations/<PascalCaseName>`
   For SQL that TypeORM cannot diff (triggers, functions, data backfills), use `npm run migration:create -- src/database/migrations/<PascalCaseName>` and write `queryRunner.query(...)` by hand.
3. Review the generated file:
   - it contains only the intended change (no unrelated drops caused by local drift)
   - `down()` reverses `up()` exactly
   - renames show as `RENAME`, not drop + add (data loss)
   - new `NOT NULL` columns on existing tables have a default or a backfill
4. If the change touches `excel_transactions` or `fund_prices`, check the average-cost trigger (latest version in `*-UpdateAverageCostTrigger.ts`) still matches the columns.
5. Verify: `npm run migration:run`, then `npm run migration:revert`, then `npm run migration:run` again, all succeeding.

Done when step 5 passes and `npm run build` and `npm test` pass.
