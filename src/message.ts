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

const html = (strings: TemplateStringsArray, ...values: string[]) => {
  return strings.map((string, index) => {
    return string + escapeHTML(values[index] ?? "");
  }).join("");
};

export function formatRichMessage(message: RichMessage): string {
  const metadata = Object.entries(message.metadata ?? {})
    .map(([key, value]) => html`#${key}: ${value}`)
    .join("\n");
  return html`${message.emoji ? `${message.emoji} • ` : ""}${
    message.channel
      ? html`<ins>#${message.channel}</ins>

`
      : ""
  }<b>${message.event}</b>${
    (message.text ?? message.message)
      ? html`

<code>${message.text ?? message.message ?? ""}</code>`
      : ""
  }

${metadata}`;
}
