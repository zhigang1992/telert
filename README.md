# Telert

Telert is a Cloudflare Worker that lets you send rich notifications to your Telegram chats using simple webhook calls.


## Features

- Generate unique webhooks for your chats with a single `/webhook` command
- Send plain text or richly formatted messages
- Upload files directly from a webhook
- Flexible mapping of JSON payloads to message fields

## Getting Started

1. Clone this repository and install dependencies with `pnpm install`.
2. Copy `wrangler.toml.example` to `wrangler.toml` and fill in the required values.
3. Run `pnpm start` to start a local development server.
4. Add `@telerts_bot` to your group and run `/webhook` to receive your webhook URL.
5. Send POST requests to the webhook URL to deliver notifications to the chat.

For detailed usage examples and API reference, see the [documentation site](./docs/).

## Deployment

Deploy your worker to Cloudflare with:

```bash
pnpm deploy
```

Ensure your account has a KV namespace configured and that the environment variables listed in `wrangler.toml` are provided.

