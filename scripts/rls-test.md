# RLS smoke test — run after seeding two users in the same scheme

Goal: verify User B cannot read User A's private evidence.

## Setup

1. Create two users in Supabase Auth:
   - `a@example.test` (User A)
   - `b@example.test` (User B)
2. Sign in as User A in the app. Onboard a scheme. Upload by-laws. Add one
   evidence item with `shared_with_scheme = false` (default).
3. Sign out. Sign in as User B. From Settings → Scheme, join the same scheme
   as `observer`. (In v1, joining is manual via SQL — see command below.)

### Add User B to the same scheme (run in Supabase SQL editor)

```sql
insert into scheme_memberships (user_id, scheme_id, role)
select auth.uid_for_email('b@example.test'), id, 'observer'
from schemes order by created_at desc limit 1;
```

Note: Supabase does not expose `auth.uid_for_email` by default — get the UUID
from the `auth.users` table and splice it in manually.

## Test

As User B, open `/evidence`. The list MUST be empty. Attempt to fetch User A's
evidence row by its UUID directly via Supabase JS client — the query MUST
return zero rows.

If either check fails, RLS is broken. Halt release.

## Automated script (optional)

```bash
# Set these env vars, then run:
# User A creates evidence, User B tries to read it.

export SB_URL="..."
export SB_ANON="..."
export USER_A_EMAIL="a@example.test"
export USER_A_PASS="..."
export USER_B_EMAIL="b@example.test"
export USER_B_PASS="..."
export SCHEME_ID="..."

curl -s "$SB_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SB_ANON" -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_A_EMAIL\",\"password\":\"$USER_A_PASS\"}" \
  | jq -r .access_token > /tmp/user_a.token

curl -s "$SB_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SB_ANON" -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_B_EMAIL\",\"password\":\"$USER_B_PASS\"}" \
  | jq -r .access_token > /tmp/user_b.token

# User A inserts private evidence
EV_ID=$(curl -s "$SB_URL/rest/v1/evidence_items?select=id" \
  -H "apikey: $SB_ANON" \
  -H "Authorization: Bearer $(cat /tmp/user_a.token)" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"scheme_id\":\"$SCHEME_ID\",\"description\":\"rls test\",\"shared_with_scheme\":false}" \
  | jq -r '.[0].id')

echo "Created $EV_ID as User A"

# User B attempts read
echo "User B attempting to read $EV_ID:"
curl -s "$SB_URL/rest/v1/evidence_items?id=eq.$EV_ID" \
  -H "apikey: $SB_ANON" \
  -H "Authorization: Bearer $(cat /tmp/user_b.token)"
# MUST return: []
```
