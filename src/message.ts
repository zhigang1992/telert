export type RichMessage = {
  channel?: string;
  event: string;
  text?: string;
  message?: string;
  emoji?: string;
  metadata?: Record<string, string>;
  notify?: boolean;
  /** Plain layout: bold title + text as normal paragraph text. No emoji, #channel or metadata lines. */
  plain?: boolean;
};

// https://www.30secondsofcode.org/js/s/escape-unescape-html/
const escapeHTML = (str: string) =>
  str?.replace(
    /[&<>'"]/g,
    (tag: string) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
  ) ?? "";

export function formatRichMessage(message: RichMessage): string {
  if (message.plain) {
    const body = message.text ?? message.message;
    const title = message.event ? `<b>${escapeHTML(message.event)}</b>` : "";
    return [title, body ? escapeHTML(body) : ""].filter(Boolean).join("\n\n");
  }
  const metadata = Object.entries(message.metadata ?? {})
    .map(([key, value]) => `#${escapeHTML(key)}: ${escapeHTML(String(value))}`)
    .join("\n");
  return `${message.emoji ? `${escapeHTML(message.emoji)} • ` : ""}${
    message.channel
      ? `<ins>#${escapeHTML(message.channel)}</ins>

`
      : ""
  }<b>${escapeHTML(message.event ?? "Unknown event")}</b>${
    (message.text ?? message.message)
      ? `

<code>${escapeHTML(message.text ?? message.message ?? "")}</code>`
      : ""
  }

${metadata}`;
}

export function webhookReply(prefix: string, webhookId: string) {
  const webhookUrl = `${prefix}/t/${webhookId}`;
  return {
    text: `<pre>${webhookUrl}</pre>`,
    replyMarkup: {
      inline_keyboard: [
        [
          {
            text: "Copy URL",
            copy_text: { text: webhookUrl },
            style: "primary",
          },
          {
            text: "Docs",
            url: `${prefix}/#id=${webhookId}&api-rich`,
          },
        ],
      ],
    },
  };
}
