# Wordyssey account security v1.0.0

This patch replaces name-only cloud profiles with Supabase Auth email/password sessions. Guest practice remains local. Both published entry points use the same account security; their learning content and visual layouts remain distinct.

## Deployment sequence

1. In the existing project `zwbhvuydslwwxobovchh`, Authentication → Sign In / Providers → Email, disable **Confirm email**. The public Auth settings endpoint currently reports `mailer_autoconfirm=false`. No new project is needed.
2. Apply the additive preparation SQL (column, index, authenticated owner policies) in `prepare_profile_privacy.sql`. This leaves the old frontend working during rollout.
3. Publish the patched HTML entry points, and verify login, signup, guest practice, and account isolation.
4. Apply `enable_profile_privacy.sql` to remove the three legacy anonymous policies and all anonymous table privileges. Do not claim that cloud progress is private before this step.
5. Verify anonymous requests are denied and that user A cannot read/update user B. Confirm all eight original rows are still present with `user_id IS NULL`.

Passwords are handled only by Supabase Auth and are not stored in the profile table, analytics, source code, or custom local storage. The Supabase SDK persists its session in the browser; no service-role key is used by the frontend. Public library reads continue to use the public API key, with the existing active-reading RLS rule.

Original profile rows are deliberately not linked based on matching email addresses. Email confirmation is disabled by request, so knowing an old email proves no ownership. Existing users may explicitly import the progress saved on their own browser. Legacy cloud-only progress requires an independently verified recovery process; this patch does not promise automatic recovery of it. No original progress rows are deleted.

Guest and user progress use distinct browser storage keys. Signing in never automatically merges the guest/previous-user progress into the new account. A backup of the pre-upgrade local state and former profile reference is retained locally. Account changes clear scheduled saves; in-flight requests are bound to the original user ID and never write a new user's data to the former profile.

## Validation

Run `node security/test_auth.cjs` with Playwright Chromium installed. It mocks Auth/Data API responses, creates no real accounts, and tests guest behavior, rejection of incorrect credentials, authenticated request scoping, logout, and account separation. The unit suite `node security/test_auth_unit.cjs` passed: legacy backup, guest isolation, rejected login, JWT-scoped writes, account separation, logout, signup guard, and no custom password storage. A transaction against the real database also passed owner read/update and cross-user/anonymous denial tests, with every change rolled back. Browser tests could not run because the Chromium download was unavailable. Both decoded application scripts are also checked with `node --check` during preparation. Live end-to-end Auth and policy tests remain mandatory during rollout.

The source patch is `account-auth.js`. `build_auth.py` patches each original encoded entry point once, retaining its encoding. It expects unpatched input from the repository base commit. Generated `check-*.js` files are temporary syntax-check inputs and are not committed.

The 18 new reading drafts remain inactive. This change neither publishes them nor enables paid generation.
