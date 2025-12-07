/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import { Application, type Middleware, Router } from "@cfworker/web";
import type { Update } from "@grammyjs/types";
import { formatRichMessage, type RichMessage } from "./message";
import { get } from "./get";
// @ts-ignore
import indexHtml from './index.html';

interface Env {
  BOT_TOKEN: string;
  WEBHOOK_PREFIX: string;
  WEBHOOK_PASSWORD: string;
  TG_GROUPS: KVNamespace;
}

// Your code here, but do not `bot.launch()`
// Do not forget to set environment variables BOT_TOKEN and SECRET_PATH on your worker

const router = new Router();
router.get("/", (context) => {
  context.res.headers.set("Content-Type", "text/html");
  context.res.body = indexHtml;
});

router.post("/bot", async (context) => {
  const env = context.environmentBindings as Env;
  // Check for authentication password in query parameter
  const password = context.req.url.searchParams.get('password');

  if (!password || password !== env.WEBHOOK_PASSWORD) {
    context.res.status = 401;
    context.res.body = { ok: false, error: "Unauthorized" };
    return;
  }

  const result: Update = await context.req.body.json();
  await processUpdate(result, env);
  console.log(JSON.stringify(result, null, 2));
  context.res.body = { ok: true };
});

router.post("/t/:webhookId/raw", async (context) => {
  const env = context.environmentBindings as Env;
  const chat = await env.TG_GROUPS.get(
    `webhook-chat:${context.req.params.webhookId}`
  );
  if (chat == null) {
    context.res.body = { ok: false, error: "chatId not found" };
    context.res.status = 404;
    return;
  }
  const result = await context.req.body.text();
  await sendToChat(env, JSON.parse(chat), result, {
    parseMode: context.req.url.searchParams.get('parseMode') as 'HTML' | undefined,
  });
  context.res.body = { ok: true };
});

router.post("/t/:webhookId/file", async (context) => {
  const env = context.environmentBindings as Env;
  const chat = await env.TG_GROUPS.get(
    `webhook-chat:${context.req.params.webhookId}`
  );
  if (chat == null) {
    context.res.body = { ok: false, error: "chatId not found" };
    context.res.status = 404;
    return;
  }
  const result = await context.req.body.json();
  await uploadFileToChat(env, JSON.parse(chat), result.fileName, result.content);
  context.res.body = { ok: true };
});

router.post("/t/:webhookId", async (context) => {
  const env = context.environmentBindings as Env;
  const chat = await env.TG_GROUPS.get(
    `webhook-chat:${context.req.params.webhookId}`
  );
  if (chat == null) {
    context.res.body = { ok: false, error: "chatId not found" };
    context.res.status = 404;
    return;
  }
  const result: RichMessage = await context.req.body.json();
  await sendToChat(env, JSON.parse(chat), formatRichMessage(result), {
    parseMode: "HTML",
    disableNotification: result.notify === false,
  });
  context.res.body = { ok: true };
});

router.get("/t/:webhookId", async (context) => {
  const env = context.environmentBindings as Env;
  const chat = await env.TG_GROUPS.get(
    `webhook-chat:${context.req.params.webhookId}`
  );
  if (chat == null) {
    context.res.body = { ok: false, error: "chatId not found" };
    context.res.status = 404;
    return;
  }

  const search = context.req.url.searchParams;
  const result: RichMessage = {
    event: search.get("event") || "Unknown Event",
    text: search.get("text") || undefined,
    channel: search.get("channel") || undefined,
    emoji: search.get("emoji") || undefined,
    notify: search.get("notify") !== "false",
    metadata: search.get("metadata") ? JSON.parse(search.get("metadata") || "{}") : undefined,
  };

  await sendToChat(env, JSON.parse(chat), formatRichMessage(result), {
    parseMode: "HTML",
    disableNotification: result.notify === false,
  });
  context.res.body = { ok: true };
});

router.post("/t/:webhookId/map", async (context) => {
  const env = context.environmentBindings as Env;
  const chat = await env.TG_GROUPS.get(
    `webhook-chat:${context.req.params.webhookId}`
  );
  if (chat == null) {
    context.res.body = { ok: false, error: "chatId not found" };
    context.res.status = 404;
    return;
  }
  const input = await context.req.body.json().catch(() => ({}));
  const search = context.req.url.searchParams;
  function getContent(key: string): string | undefined {
    const param = search.get(key);
    if (!param) {
      return undefined;
    }
    return param.startsWith("$json") ? get(input, param.slice(6)) : param;
  }
  const metadataParams = Array.from(search.entries()).filter(([k]) =>
    k.startsWith("metadata.")
  );
  const result: RichMessage = {
    event: getContent("event") || "Unknown Event",
    text: getContent("text"),
    channel: getContent("channel"),
    emoji: getContent("emoji"),
    notify: search.get("notify") !== "false",
    metadata:
      metadataParams.length === 0
        ? undefined
        : Object.fromEntries(
            metadataParams
              .map(([k, v]) => [k.slice(9), v])
              .map(([key, value]) => [
                key,
                value.startsWith("$json") ? get(input, value.slice(6)) : value,
              ])
          ),
  };
  await sendToChat(env, JSON.parse(chat), formatRichMessage(result), {
    parseMode: "HTML",
    disableNotification: result.notify === false,
  });
  context.res.body = { ok: true };
});

const cors: Middleware = async ({ req, res }, next) => {
  // Set CORS headers
  res.headers.set("access-control-allow-origin", "*");
  res.headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
  res.headers.set("access-control-allow-headers", "Content-Type");
  res.headers.set("access-control-max-age", "86400");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status = 204;
    return;
  }

  await next();
};

const app = new Application().use(cors).use(router.middleware);

export default {
  fetch: (request: Request, env: any, ctx: ExecutionContext) =>
    app.handleRequest(request, env, ctx),
};

async function processUpdate(update: Update, env: Env): Promise<void> {
  const message = update.message ?? update.channel_post;
  if (message == null) {
    return;
  }

  // Handle migration to supergroup
  if (message.migrate_to_chat_id) {
    const oldChatId = message.chat.id;
    const newChatId = message.migrate_to_chat_id;

    // Find any existing webhook for the old chat ID
    const oldChat = JSON.stringify({
      chatId: oldChatId,
      messageThreadId: message.message_thread_id,
    });
    const webhookId = await env.TG_GROUPS.get(`chat-webhook:${oldChat}`);

    if (webhookId) {
      // Update the stored chat info with new chat ID
      const newChat = JSON.stringify({
        chatId: newChatId,
        messageThreadId: message.message_thread_id,
      });
      await env.TG_GROUPS.put(`chat-webhook:${newChat}`, webhookId);
      await env.TG_GROUPS.put(`webhook-chat:${webhookId}`, newChat);

      // Delete old mapping
      await env.TG_GROUPS.delete(`chat-webhook:${oldChat}`);
    }
    return;
  }

  if (message.text === "/webhook" || message.text === "/webhook@telerts_bot") {
    const chatId = message.chat.id;
    const chat = {
      chatId,
      messageThreadId: message.message_thread_id,
    };
    const chatKey = JSON.stringify(chat);
    const key = `chat-webhook:${chatKey}`;
    const result = await env.TG_GROUPS.get(key);
    let webhookUrl: string;
    if (result == null) {
      const uuid = crypto.randomUUID();
      await env.TG_GROUPS.put(key, uuid);
      await env.TG_GROUPS.put(`webhook-chat:${uuid}`, chatKey);
      webhookUrl = `${env.WEBHOOK_PREFIX}/t/${uuid}`;
    } else {
      await env.TG_GROUPS.put(`webhook-chat:${result}`, chatKey);
      webhookUrl = `${env.WEBHOOK_PREFIX}/t/${result}`;
    }
    await sendToChat(
      env,
      chat,
      `<code>${webhookUrl}</code>

<code>
{
  "event": "New User Registered",
  "channel": "WebApp",
  "emoji": "👋",
  "metadata": {
    "email": "test@example.com"
  },
  "text": "Congratz! New user just registered",
  "notify": true
}
</code>

* Only event is required
`,
      {
        parseMode: "HTML",
      }
    );
  }
}

async function sendToChat(
  env: Env,
  chat: {
    chatId: number;
    messageThreadId?: number;
  },
  text: string,
  options?: {
    parseMode?: "HTML";
    disableNotification?: boolean;
  }
): Promise<void> {
  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chat.chatId,
      message_thread_id: chat.messageThreadId,
      text,
      parse_mode: options?.parseMode,
      disable_notification: options?.disableNotification,
    }),
  });
}

async function uploadFileToChat(
  env: Env,
  chat: {
    chatId: number;
    messageThreadId?: number;
  },
  fileName: string,
  content: string
) {
  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendDocument`, {
    method: "POST",
    headers: {
      "Content-Type": "multipart/form-data; boundary=WebAppBoundary",
    },
    body: `--WebAppBoundary
Content-Disposition: form-data; name="chat_id"
Content-Type: text/plain

${chat.chatId}
${
  chat.messageThreadId != null
    ? `--WebAppBoundary
Content-Disposition: form-data; name="message_thread_id"
Content-Type: text/plain

${chat.messageThreadId}
`
    : ""
}--WebAppBoundary
Content-Disposition: form-data; name="document"; filename="${fileName}"
Content-Type: application/octet-stream

${content}
--WebAppBoundary--`.replace(/\n/g, "\r\n"),
  }).then((a) => a.json());
}
