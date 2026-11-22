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
  it("is short and links to the docs with the id in the hash", () => {
    const text = webhookReply("https://x.app", "abc");
    expect(text).toContain("<code>https://x.app/t/abc</code>");
    expect(text).toContain("https://x.app/t/abc/photo");
    expect(text).toContain('"plain": true');
    expect(text).toContain("https://x.app/#id=abc&amp;api-rich");
    expect(text).not.toContain("curl");
  });
});
