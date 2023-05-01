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
  const chat = await TG_GROUPS.get(
    `webhook-chat:${context.req.params.webhookId}`
  );
  if (chat == null) {
    context.res.body = { ok: false, error: "chatId not found" };
    context.res.status = 404;
    return;
  }
  const result = await context.req.body.text();
  await sendToChat(JSON.parse(chat), result);
  context.res.body = { ok: true };
});

router.post("/t/:webhookId", async (context) => {
  const chat = await TG_GROUPS.get(
    `webhook-chat:${context.req.params.webhookId}`
  );
  if (chat == null) {
    context.res.body = { ok: false, error: "chatId not found" };
    context.res.status = 404;
    return;
  }
  const result: RichMessage = await context.req.body.json();
  await sendToChat(JSON.parse(chat), formatRichMessage(result), "HTML");
  context.res.body = { ok: true };
});

new Application().use(router.middleware).listen();

async function processUpdate(update: Update): Promise<void> {
  console.log(JSON.stringify(update, null, 2));
  if (update.message == null) {
    return;
  }
  if (update.message.text === "/webhook") {
    const chatId = update.message.chat.id;
    const chat = {
      chatId,
      messageThreadId: update.message.message_thread_id,
    };
    const key = `chat-webhook:${JSON.stringify(chat)}`;
    const result = await TG_GROUPS.get(key);
    let webhookUrl: string;
    if (result == null) {
      const uuid = crypto.randomUUID();
      await TG_GROUPS.put(key, uuid);
      await TG_GROUPS.put(`webhook-chat:${uuid}`, JSON.stringify(chat));
      webhookUrl = `${WEBHOOK_PREFIX}/t/${uuid}`;
    } else {
      await TG_GROUPS.put(`webhook-chat:${result}`, JSON.stringify(chat));
      webhookUrl = `${WEBHOOK_PREFIX}/t/${result}`;
    }
    await sendToChat(
      chat,
      `<code>${webhookUrl}</code>

<code>
{
  "event": "New User Registered",
  "channel": "WebApp",
  "emoji": "👋",
  "metadata": {
    "email": "test@example.com"
  }
}
</code>

* Only event is required 
`,
      "HTML"
    );
  }
}

async function sendToChat(
  chat: {
    chatId: number;
    messageThreadId?: number;
  },
  text: string,
  parseMode?: "HTML"
): Promise<void> {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chat.chatId,
      message_thread_id: chat.messageThreadId,
      text,
      parse_mode: parseMode,
    }),
  });
}
