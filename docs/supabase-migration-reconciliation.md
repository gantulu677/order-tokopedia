# Supabase Migration History Reconciliation

Project: `bkyqbbigfvfaobblxziu`  
Last inspected: 2026-11-26  
Deployment rule: **Do not run `supabase db push` until the complete historical migration set has been reconstructed and reviewed.**

## Live migration history

The Supabase project reports these 26 applied migrations:

| Version | Name |
|---|---|
| 20261117081726 | create_public_generated_images |
| 20261117135324 | create_products_and_make_post |
| 20261117135404 | lock_down_rls_auto_enable_function |
| 20261118025435 | create_image_templates_table |
| 20261119123803 | create_master_template_prompt |
| 20261119124422 | convert_template_options_to_jsonb |
| 20261119124839 | enable_public_crud_master_template_prompt |
| 20261119154823 | create_content_pillars |
| 20261119161720 | create_master_categories |
| 20261124185220 | create_whatsapp_webhook_tables |
| 20261124193540 | create_whatsapp_settings |
| 20261124193818 | remove_whatsapp_access_token_secret_reference |
| 20261124224035 | whatsapp_schema_hardening |
| 20261124224053 | whatsapp_foreign_key_indexes |
| 20261124230312 | whatsapp_public_access_policies |
| 20261124231004 | enable_realtime_for_all_whatsapp_tables |
| 20261125154556 | create_produks_table |
| 20261125155656 | tokopedia_admin_roles_and_seed_accounts |
| 20261125160031 | restrict_public_produks_to_select_only |
| 20261125160350 | create_public_images_storage_bucket |
| 20261125161034 | enable_realtime_for_tokopedia_produks |
| 20261125190342 | add_name_to_admin_tokopedia |
| 20261125194647 | add_features_jsonb_to_produks |
| 20261125194947 | set_product_features_validator_search_path |
| 20261125202221 | create_admin_bank_and_chat |
| 20261125212640 | admin_bank_save_atomic |

## Repository migration files

The branch contains these seven files:

- `20261125160000_tokopedia_admin_roles_and_product_access.sql`
- `20261125190342_add_name_to_admin_tokopedia.sql`
- `20261125194647_add_features_jsonb_to_produks.sql`
- `20261125194947_set_product_features_validator_search_path.sql`
- `20261125202221_create_admin_bank_and_chat.sql`
- `20261126100000_create_public_images_bucket.sql`
- `20261125212640_admin_bank_save_atomic.sql`

## Reconciliation findings

- Five repository files now match a live migration version and name, including the new atomic bank-save migration.
- The local `20261125160000_tokopedia_admin_roles_and_product_access.sql` does not match the two live versions `20261125155656` and `20261125160031`. Its combined filename/content must not be treated as a verified substitute for both historical migrations.
- The local `20261126100000_create_public_images_bucket.sql` differs in version/name from live `20261125160350_create_public_images_storage_bucket`. The live `images` bucket and its public-read policy were inspected and are present, but the original historical SQL is not available in this repository, so the files are not declared equivalent.
- Twenty-one live migration versions still have no exact corresponding repository migration file.

## Safe deployment state

- The database-migration workflow remains gated by `vars.SUPABASE_MIGRATIONS_READY == 'true'`.
- Keep that variable unset/false. Do not enable migration deployment yet.
- Do not use `supabase migration repair`, fabricate historical SQL, or run `db push` to force the histories together.
- Reconstruct the missing historical migrations from authoritative backups/exported SQL, compare them against the live schema, then review the complete ordered set before enabling automated migration deployment.
- The Edge Function deployment workflow separately requires the GitHub Actions secret `SUPABASE_ACCESS_TOKEN`. Keep credentials out of source control.
