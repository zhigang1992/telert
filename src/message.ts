export type RichMessage = {
  channel?: string;
  event: string;
  text?: string;
  message?: string;
  emoji?: string;
  metadata?: Record<string, string>;
  notify?: boolean;
};

export function formatRichMessage(message: RichMessage): string {
  const metadata = Object.entries(message.metadata ?? {})
    .map(([key, value]) => `#${key}: ${value}`)
    .join("\n");
  return `${message.emoji ? `${message.emoji} • ` : ""}${
    message.channel
      ? `<ins>#${message.channel}</ins>

`
      : ""
  }<b>${message.event}</b>${
    (message.text ?? message.message)
      ? `

<code>${message.text ?? message.message}</code>`
      : ""
  }

${metadata}`;
}
