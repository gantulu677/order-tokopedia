# Supabase deployment from GitHub

The `main` branch is the source for the `tokopedia-admin` Edge Function. The
`Deploy Supabase` workflow deploys that function after relevant changes land.

## Required GitHub secret

- `SUPABASE_ACCESS_TOKEN`: Supabase personal access token with access to project
  `bkyqbbigfvfaobblxziu`.

## Database migration deployment gate

Database migration deployment is deliberately gated by the repository variable
`SUPABASE_MIGRATIONS_READY=true`. The live project currently has historical
migration versions that are not represented in this repository's migration
directory. Enabling `supabase db push` before reconciling that history could
cause migration drift or duplicate DDL. Keep this variable unset until the
repository migration history has been reconciled against the live project.

When ready, also configure the GitHub secret `SUPABASE_DB_PASSWORD`. The
workflow then links the project, displays migration status, and applies pending
repository migrations. Never commit Supabase access tokens or database passwords.
