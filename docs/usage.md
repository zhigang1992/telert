# Usage

Send JSON payloads to the webhook to control the message.

```json
{
  "event": "New Order",
  "text": "Order #123 was placed",
  "emoji": "🛒",
  "metadata": {
    "customer": "alice@example.com"
  }
}
```

Fields:

- `event` *(required)*: short title of the notification
- `text`: message body
- `emoji`: emoji to prefix the message
- `metadata`: key/value pairs shown as tags
- `notify`: set to `false` to disable notifications
