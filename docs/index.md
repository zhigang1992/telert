# Telert

Telert lets you send Telegram notifications from anywhere with a simple webhook call.

Use the `/webhook` command in your chat to generate a unique URL and POST your event data to it.

```bash
curl -X POST <YOUR_WEBHOOK_URL> \
  -H 'Content-Type: application/json' \
  -d '{"event":"Build Finished","emoji":"✅"}'
```

The bot will deliver the message to your chat.
