# CigarDex Change Log

## 2026-04-25

### Industry membership permissions
- Store access now follows the user's `store_accounts` tie instead of relying only on `users.role = 'store'`.
- Brand-rep access now follows approved `brand_rep_brands` associations instead of relying only on `users.role = 'brand'`.
- Reviewer access now supports a real publication-membership model through `reviewer_publications` and `reviewer_publication_members`.

### Reviewer publication support
- Added shared reviewer publication helpers for resolving industry access and syncing reviewer publication records.
- Updated reviewer setup to read from publication membership first and keep legacy `users.publication_*` fields in sync.
- Updated industry application approval so reviewer approvals can create reviewer publication membership records.
- Updated cigar review pages so reviewer-linked accounts are treated as press accounts for source URLs, sorting, and badges.
- Updated header, dashboard, and profile metadata so reviewer membership is recognized even when the raw `users.role` field is not the only source of truth.

### Database handoff
- Added ready-to-run SQL at `sql/reviewer_publications.sql` for the reviewer publication tables, indexes, and RLS policies.

### Verification
- `npx.cmd tsc --noEmit` passes after these changes.
