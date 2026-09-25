# PostgreSQL migration runbook

This runbook prepares the SQLite-to-PostgreSQL cutover without modifying
production data. Execute it only against an owner-approved environment with a
tested backup.

## Before the maintenance window

1. Back up the source SQLite database and record its checksum.
2. Provision an empty PostgreSQL database with encrypted connections.
3. Store the pooled `DATABASE_URL` and direct `DIRECT_URL` only in protected
   environment variables.
4. Verify schema parity and validate both Prisma schemas:

   ```powershell
   npm run db:schemas:check
   npm run db:postgres:validate
   ```

5. Review `prisma/postgresql/migrations/0001_initial/migration.sql`.
6. Restore the SQLite backup into a disposable environment and rehearse the
   export, import, record-count comparison, and rollback steps.

## Cutover

1. Stop writes to the SQLite application.
2. Take a final SQLite backup and record its checksum.
3. Apply the reviewed PostgreSQL migration:

   ```powershell
   npm run db:postgres:migrate:deploy
   ```

4. Transfer data with an owner-approved migration tool. Preserve primary keys,
   timestamps, enum values, nullable fields, and foreign-key order.
5. Compare record counts for every table and spot-check relationships,
   suppression entries, audit events, and encrypted OAuth token fields.
6. Run the full application smoke workflow against PostgreSQL using fixture
   data and mock integrations.
7. Switch only the access-controlled Preview environment to PostgreSQL.
8. Keep SQLite read-only until the Preview acceptance window is complete.

The repository intentionally does not include an automatic data-copy command:
the source database may contain personal data, and choosing or running a
transfer tool requires access to the owner-controlled databases.

## Rollback

If validation fails before Preview writes begin, point Preview back to the
read-only SQLite backup and remove the failed PostgreSQL database.

If PostgreSQL has accepted any new writes, do not perform an automatic
down-migration or silently overwrite SQLite. Stop writes, preserve both data
sets, export the PostgreSQL changes, and obtain an explicit reconciliation
decision before restoring service.

## Acceptance evidence

Record these without copying credentials or personal data:

- backup timestamps and checksums;
- migration version and Git commit;
- per-table source and destination counts;
- schema parity, lint, type-check, tests, build, and smoke-test results;
- rollback rehearsal result;
- approver and Preview cutover timestamp.
