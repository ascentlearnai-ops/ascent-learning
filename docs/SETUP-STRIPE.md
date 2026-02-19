# Stripe Upgrade Setup (Scholar Tier)

Add Stripe to let users upgrade to Scholar. Subtle prompts—no aggressive popups.

## Prerequisites

- Stripe account (free)
- Backend (Vercel/Netlify Functions or Supabase Edge Functions)

## Step 1: Stripe Dashboard

1. Create account at [stripe.com](https://stripe.com)
2. **Products** → Create product: "Scholar Upgrade"
3. Add price: one-time (e.g. $9.99 or $19.99)
4. Copy **Price ID** (e.g. `price_xxx`)

## Step 2: API Keys

1. **Developers** → **API keys**
2. Copy **Publishable key** (starts with `pk_`) — safe for frontend
3. Copy **Secret key** (starts with `sk_`) — **never** expose; use in serverless only

## Step 3: Create Checkout Session (Serverless)

Create a Vercel serverless function or Netlify function:

**Vercel: `api/create-checkout.js`**

```js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price: process.env.STRIPE_PRICE_ID, // Scholar price
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${req.headers.origin}/?upgrade=success`,
    cancel_url: `${req.headers.origin}/?upgrade=cancelled`,
    metadata: { userId: req.body?.userId || 'anonymous' },
  });
  res.json({ url: session.url });
}
```

Environment variables (Vercel):
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`

## Step 4: Frontend Integration

Add a subtle upgrade CTA. Example:

```ts
async function handleUpgrade() {
  const res = await fetch('/api/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: currentUserId }),
  });
  const { url } = await res.json();
  window.location.href = url;
}
```

## Step 5: Where to Show Upgrade Prompts (Subtle)

1. **Sidebar banner** — Small text: "Unlock Scholar →" (one line, not blocking)
2. **When hitting limits** — If user hits daily upload/chat limit, show: "Upgrade for more capacity"
3. **SAT Prep lock** — Initiate tier sees "Scholar required" (already implemented)

**Avoid:** Modal popups on every page load, multiple upgrade prompts per session.

## Step 6: Post-Payment: Grant Scholar

After successful payment, Stripe can trigger a webhook. Create `api/stripe-webhook.js`:

```js
// Verify Stripe signature, then update user tier in your DB
// e.g. Supabase: update user's tier to 'Scholar' by email or userId
```

Or use Stripe Customer Portal for subscription management if you switch to recurring billing later.
