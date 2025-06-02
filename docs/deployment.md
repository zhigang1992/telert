# Deployment

1. Copy `wrangler.toml.example` to `wrangler.toml`.
2. Fill in `BOT_TOKEN`, `WEBHOOK_PREFIX` and your KV namespace IDs.
3. Run:

```bash
pnpm deploy
```

Your worker will be published to Cloudflare and ready to accept requests.
