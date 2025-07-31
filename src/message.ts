export type RichMessage = {
  channel?: string;
  event: string;
  text?: string;
  message?: string;
  emoji?: string;
  metadata?: Record<string, string>;
  notify?: boolean;
};

// https://www.30secondsofcode.org/js/s/escape-unescape-html/
const escapeHTML = (str: string) =>
  str.replace(
    /[&<>'"]/g,
    (tag: string) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
  );

export function formatRichMessage(message: RichMessage): string {
  const metadata = Object.entries(message.metadata ?? {})
    .map(([key, value]) => `#${escapeHTML(key)}: ${escapeHTML(value)}`)
    .join("\n");
  return `${message.emoji ? `${escapeHTML(message.emoji)} • ` : ""}${
    message.channel
      ? `<ins>#${escapeHTML(message.channel)}</ins>

`
      : ""
  }<b>${escapeHTML(message.event)}</b>${
    (message.text ?? message.message)
      ? `

<code>${escapeHTML(message.text ?? message.message ?? "")}</code>`
      : ""
  }

${metadata}`;
}
