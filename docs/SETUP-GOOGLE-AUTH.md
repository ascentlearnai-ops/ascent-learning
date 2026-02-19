# Google Sign-In Setup (25 User Limit)

Add Google/Gmail login to Ascent using **Supabase Auth**. Limit to 25 beta users.

## Prerequisites

- Supabase project (free tier)
- Google Cloud Console account

## Step 1: Supabase Project

1. Go to [supabase.com](https://supabase.com) → Create project
2. In **Authentication** → **Providers** → enable **Google**
3. Copy the Redirect URL Supabase shows (e.g. `https://YOUR_PROJECT.supabase.co/auth/v1/callback`)

## Step 2: Google Cloud OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select one
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
4. Application type: **Web application**
5. Authorized redirect URIs: paste the Supabase callback URL from Step 1
6. Copy **Client ID** and **Client Secret**

## Step 3: Link Google to Supabase

1. Supabase → **Authentication** → **Providers** → **Google**
2. Paste Client ID and Client Secret
3. Save

## Step 4: Beta User Limit (25 users)

Create a Supabase table to track allowed beta users:

```sql
-- Run in Supabase SQL Editor
create table if not exists beta_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now()
);

-- Only allow 25 rows
alter table beta_users add constraint beta_limit check (
  (select count(*) from beta_users) <= 25
);
```

Or use a simpler approach: create a **Supabase Edge Function** that checks `auth.users` count before allowing sign-up. For 25 beta invites, you can manually add 25 emails to `beta_users` and only allow sign-in if the user's email is in that table.

## Step 5: Environment Variables

Add to `.env` and your deployment (Vercel/Netlify):

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Step 6: Code Integration

The `lib/supabase.ts` already exists. Add a Google sign-in handler:

```ts
import { supabase } from '../lib/supabase';

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
  if (error) throw error;
  window.location.href = data.url; // Redirect to Google
}
```

In your LandingPage, add a "Sign in with Google" button that calls this. After redirect, Supabase will handle the session. Check `supabase.auth.getSession()` to get the current user.

## 25 User Limit Logic

**Option A (recommended):** Use Supabase RLS + `beta_users` table. When a user signs in with Google:
1. Check if their email exists in `beta_users`
2. If not and count < 25, add them (via Edge Function or your backend)
3. If count >= 25 and email not in table, show "Beta full" message

**Option B:** Use a Vercel/Netlify serverless function that:
1. Receives the OAuth callback
2. Queries Supabase `auth.users` count
3. If < 25, allow; else reject with a friendly message

For a simple MVP, you can skip the limit initially and add it once you have backend logic.
