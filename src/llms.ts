// Plain-text API reference served at GET /llms.txt, for AI coding agents.
// Keep in sync with the handlers in src/index.ts and the layout in src/message.ts.
export const llmsTxt = `# Telert

> Telert turns a webhook URL into Telegram notifications. POST (or GET) to the URL and the message appears in the Telegram chat it belongs to.

Base URL: https://telert.reily.app
Docs with live previews: https://telert.reily.app/

## Getting a webhook URL

1. Add @telerts_bot (https://t.me/telerts_bot) to a Telegram chat, group or topic.
2. Send /webhook in that chat. The bot replies with the URL: https://telert.reily.app/t/<webhook-id>
3. Use that URL below. It is the only credential: anyone who has it can post to the chat, so keep it secret.

In every example, replace <webhook-id> with the real id. Requests are not authenticated otherwise. CORS is open (any origin).

Responses: {"ok": true} on success, 404 {"ok": false, "error": "chatId not found"} for an unknown id. Text endpoints return ok: true once the request is accepted; Telegram delivery errors are not reported (except /photo).

## POST /t/<webhook-id> : rich message

Body: JSON.

| field    | type                   | notes |
|----------|------------------------|-------|
| event    | string                 | Title, shown in bold. Defaults to "Unknown event". |
| text     | string                 | Body, shown in monospace. "message" is accepted as an alias. |
| emoji    | string                 | Shown before the channel, as "EMOJI • #channel". |
| channel  | string                 | Shown underlined as #channel (a label for the source app). |
| metadata | object of string values | One line per entry: "#key: value". |
| notify   | boolean                | false sends silently (no sound or vibration). Default true. |
| plain    | boolean                | true gives a plain layout: bold title, blank line, text as normal paragraph text. No emoji, channel or metadata lines are shown. |

All values are HTML-escaped; Markdown and HTML in them are shown literally.

Rich example:

    curl -X POST https://telert.reily.app/t/<webhook-id> \\
      -H "Content-Type: application/json" \\
      -d '{
        "event": "New User Registered",
        "channel": "WebApp",
        "emoji": "👋",
        "text": "A new user just signed up!",
        "metadata": { "email": "user@example.com", "plan": "Pro" },
        "notify": true
      }'

Telegram shows:

    👋 • #WebApp

    New User Registered            (bold)

    A new user just signed up!     (monospace)

    #email: user@example.com
    #plan: Pro

Plain example:

    curl -X POST https://telert.reily.app/t/<webhook-id> \\
      -H "Content-Type: application/json" \\
      -d '{ "event": "Deploy finished", "text": "v1.2 is live", "plain": true }'

Telegram shows a bold "Deploy finished", a blank line, then "v1.2 is live" as normal text.

## GET /t/<webhook-id> : simple GET

For scripts that can only make GET requests. Query parameters:

- event: title (default "Unknown Event")
- text, emoji, channel: as above
- notify: false for a silent message
- metadata: URL-encoded JSON object, e.g. {"env":"prod"}

The plain option is not available on GET.

    curl "https://telert.reily.app/t/<webhook-id>?event=Deploy&text=v1.2+Live&emoji=🚀"

## POST /t/<webhook-id>/map : JSON mapping

For forwarding third-party webhooks (GitHub, Stripe, Jira, ...) without glue code. Body: any JSON. The message fields are given as query parameters. A parameter value is used literally, unless it starts with $json, in which case it is read from the body: $json.repo.name, $json.items[0].title.

- event, text, channel, emoji: literal or $json.path
- metadata.<key>=<literal or $json.path>: adds a "#key: value" line. Repeat for several keys.
- notify=false: silent message

Quote the URL and escape the dollar sign in shells ($json becomes \\$json).

    curl -X POST "https://telert.reily.app/t/<webhook-id>/map?event=\\$json.action&text=\\$json.repo.name&metadata.sender=\\$json.sender.login" \\
      -H "Content-Type: application/json" \\
      -d '{ "action": "push", "repo": { "name": "backend-api" }, "sender": { "login": "octocat" } }'

## POST /t/<webhook-id>/file : file upload

Sends a text file as a Telegram document. Body: JSON with fileName and content (string).

    curl -X POST https://telert.reily.app/t/<webhook-id>/file \\
      -H "Content-Type: application/json" \\
      -d '{ "fileName": "error.log", "content": "Stack trace details..." }'

## POST /t/<webhook-id>/photo : send photo

Sends an image, optionally with a caption built like the rich message above. Two body types:

- multipart/form-data: photo is a file (@./image.jpg) or an http(s) URL string.
- JSON: { "photo": "https://example.com/image.jpg", ... }

Caption fields: event, text, channel, emoji, metadata, notify, plain, as in the rich message. In multipart, metadata is a JSON string. With no event and no text there is no caption. If only text is given (and plain is not set) the title defaults to "Photo". Captions over 1024 characters are sent as a separate message after the photo.

Errors: 400 if photo is missing or metadata is not valid JSON; 502 with {"ok": false, "error": "..."} if Telegram rejects the photo.

    curl -X POST https://telert.reily.app/t/<webhook-id>/photo \\
      -F photo=@./image.jpg \\
      -F event="John Appleseed" \\
      -F text="Message text" \\
      -F plain=true

    curl -X POST https://telert.reily.app/t/<webhook-id>/photo \\
      -H "Content-Type: application/json" \\
      -d '{ "photo": "https://example.com/chart.png", "event": "Daily report" }'

## POST /t/<webhook-id>/raw : raw Telegram text

The request body is sent as the message text, unchanged (not JSON). Query parameters:

- parseMode=HTML: let Telegram parse HTML tags (<b>, <i>, <code>, <a href>, ...)
- disablePreview=1 (or true): no link preview
- notify=false: silent message

    curl -X POST "https://telert.reily.app/t/<webhook-id>/raw?parseMode=HTML&disablePreview=1" \\
      -d '<b>Build passed</b> https://example.com/run/42'

## Quick recipe

Notify when a long command finishes:

    ./long-task.sh; curl -s -X POST https://telert.reily.app/t/<webhook-id> \\
      -H "Content-Type: application/json" \\
      -d "{\\"event\\": \\"long-task.sh finished\\", \\"text\\": \\"exit code $?\\", \\"plain\\": true}"
`;
