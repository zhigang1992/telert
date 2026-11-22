import { describe, expect, it } from "vitest";
import { formatRichMessage, webhookReply } from "./message";

describe("formatRichMessage", () => {
  it("keeps the default layout", () => {
    expect(
      formatRichMessage({
        event: "Boon",
        text: "hi",
        channel: "WhatsApp",
        emoji: "💬",
        metadata: { contact: "A" },
      })
    ).toBe(
      "💬 • <ins>#WhatsApp</ins>\n\n<b>Boon</b>\n\n<code>hi</code>\n\n#contact: A"
    );
  });

  it("plain renders only a bold title and the text", () => {
    expect(
      formatRichMessage({
        event: "Boon",
        text: "a < b",
        channel: "WhatsApp",
        emoji: "💬",
        metadata: { contact: "A" },
        plain: true,
      })
    ).toBe("<b>Boon</b>\n\na &lt; b");
  });

  it("plain without a title is just the text", () => {
    expect(formatRichMessage({ event: "", text: "hi", plain: true })).toBe("hi");
  });
});

describe("webhookReply", () => {
  it("is just the URL in a code block with copy and docs buttons", () => {
    const { text, replyMarkup } = webhookReply("https://x.app", "abc");
    expect(text).toBe("<pre>https://x.app/t/abc</pre>");
    expect(replyMarkup).toEqual({
      inline_keyboard: [
        [
          {
            text: "Copy URL",
            copy_text: { text: "https://x.app/t/abc" },
            style: "primary",
          },
          { text: "Docs", url: "https://x.app/#id=abc&api-rich" },
        ],
      ],
    });
  });
});
