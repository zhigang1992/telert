export type RichMessage = {
  topic: string;
  event: string;
  text?: string;
  emoji?: string;
  metadata?: Record<string, string>;
};

export function formatRichMessage(message: RichMessage): string {
  const metadata = Object.entries(message.metadata ?? {})
    .map(([key, value]) => `#${key}: ${value}`)
    .join("\n");
  return `${message.emoji ? message.emoji + " • " : ""}<ins>#${
    message.topic
  }</ins>

<b>${message.event}</b>${message.text ? `

<code>${message.text}</code>` : ""}

${metadata}`;
}
