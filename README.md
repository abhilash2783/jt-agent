# Teams ↔ Jira Webhook Bridge

A minimal, production-ready bridge to relay messages between Microsoft Teams and Jira using only webhooks. Zero-cost infra, deployable to Render, Vercel, or Railway free tier.

## Features
- Stateless, secure, and minimal
- Receives webhooks from Teams and Jira, relays/transforms as needed
- No database or paid infra required

## Setup
1. **Clone & install:**
   ```sh
   git clone <repo-url>
   cd jt-agent
   npm install
   ```
2. **Configure:**
   - Copy `.env.example` to `.env` and set secrets/URLs as needed.
3. **Run locally:**
   ```sh
   npm run dev
   ```

## Deploy (Free Tier)
- Deploy to [Render](https://render.com), [Vercel](https://vercel.com), or [Railway](https://railway.app) as a Node.js service.
- Set environment variables in the dashboard as per `.env.example`.

## Usage
- Set your Teams and Jira webhooks to point to your deployed URL:
  - `/webhook/teams` for Teams
  - `/webhook/jira` for Jira
- The bridge will forward/transform messages between the two systems.

## Security
- Use secret tokens in your webhook URLs or headers for authentication.

---
MIT License
