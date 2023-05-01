/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import { Application, Router } from "@cfworker/web";
import type { Update } from "@grammyjs/types";
import { formatRichMessage, RichMessage } from "./message";

declare global {
  const BOT_TOKEN: string;

  const WEBHOOK_PREFIX: string;

  const TG_GROUPS: KVNamespace;
}

// Your code here, but do not `bot.launch()`
// Do not forget to set environment variables BOT_TOKEN and SECRET_PATH on your worker

const router = new Router();
router.post("/bot", async (context) => {
  const result: Update = await context.req.body.json();
  await processUpdate(result);
  console.log(JSON.stringify(result, null, 2));
  context.res.body = { ok: true };
});

router.post("/t/:webhookId/raw", async (context) => {
  const chatId = await TG_GROUPS.get(
    `webhook-chat:${context.req.params.webhookId}`
  );
  if (chatId == null) {
    context.res.body = { ok: false, error: "chatId not found" };
    context.res.status = 404;
  }
  const result = await context.req.body.text();
  await sendToChat(Number(chatId), result);
  context.res.body = { ok: true };
});

router.post("/t/:webhookId", async (context) => {
  const chatId = await TG_GROUPS.get(
    `webhook-chat:${context.req.params.webhookId}`
  );
  if (chatId == null) {
    context.res.body = { ok: false, error: "chatId not found" };
    context.res.status = 404;
  }
  const result: RichMessage = await context.req.body.json();
  await sendToChat(Number(chatId), formatRichMessage(result), "HTML");
  context.res.body = { ok: true };
});

new Application().use(router.middleware).listen();

async function processUpdate(update: Update): Promise<void> {
  if (update.message == null) {
    return;
  }
  if (update.message.text === "/webhook") {
    const chatId = update.message.chat.id;
    const key = `chat-webhook:${chatId}`;
    const result = await TG_GROUPS.get(key);
    let webhookUrl: string;
    if (result == null) {
      const uuid = crypto.randomUUID();
      await TG_GROUPS.put(key, uuid);
      await TG_GROUPS.put(`webhook-chat:${uuid}`, chatId.toString());
      webhookUrl = `${WEBHOOK_PREFIX}/t/${uuid}`;
    } else {
      await TG_GROUPS.put(`webhook-chat:${result}`, chatId.toString());
      webhookUrl = `${WEBHOOK_PREFIX}/t/${result}`;
    }
    await sendToChat(chatId, `<a href="${webhookUrl}">${webhookUrl}</a>

<code>
{
  "topic": "WebApp",
  "event": "New User Registered",
  "emoji": "👋",
  "metadata": {
    "email": "test@example.com"
  }
}
</code>
`, 'HTML');
  }
}

async function sendToChat(
  chatId: number,
  text: string,
  parseMode?: "HTML"
): Promise<void> {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    }),
  });
}
