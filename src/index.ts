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
import { formatRichMessage, webhookReply, type RichMessage } from "./message";
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
  const search = context.req.url.searchParams;
  await sendToChat(env, JSON.parse(chat), result, {
    parseMode: search.get('parseMode') as 'HTML' | undefined,
    disableLinkPreview: ["1", "true"].includes(search.get('disablePreview') ?? ""),
    disableNotification: search.get('notify') === "false",
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

router.post("/t/:webhookId/photo", async (context) => {
  const env = context.environmentBindings as Env;
  const chat = await env.TG_GROUPS.get(
    `webhook-chat:${context.req.params.webhookId}`
  );
  if (chat == null) {
    context.res.body = { ok: false, error: "chatId not found" };
    context.res.status = 404;
    return;
  }

  // Either multipart/form-data (photo = file, or a URL string) or JSON ({ photo: url, ...message fields }).
  const isForm = (context.req.headers.get("content-type") ?? "").includes(
    "multipart/form-data"
  );
  const fields: Record<string, unknown> = {};
  let photo: string | Blob | undefined;
  if (isForm) {
    const form = await context.req.body.formData();
    form.forEach((value, key) => {
      fields[key] = value;
    });
    photo = fields.photo as string | Blob | undefined;
  } else {
    Object.assign(fields, await context.req.body.json().catch(() => ({})));
    photo = fields.photo as string | undefined;
  }
  if (photo == null || photo === "") {
    context.res.status = 400;
    context.res.body = {
      ok: false,
      error: "photo is required (a file upload or an http(s) URL)",
    };
    return;
  }

  const str = (key: string) =>
    typeof fields[key] === "string" ? (fields[key] as string) : undefined;
  const bool = (key: string) => ["1", "true"].includes(String(fields[key]));
  let metadata: Record<string, string> | undefined;
  try {
    const raw = fields.metadata;
    metadata = typeof raw === "string" ? JSON.parse(raw) : (raw as any);
  } catch {
    context.res.status = 400;
    context.res.body = { ok: false, error: "metadata must be valid JSON" };
    return;
  }
  const message: RichMessage = {
    event: str("event") ?? "",
    text: str("text"),
    channel: str("channel"),
    emoji: str("emoji"),
    metadata,
    notify: String(fields.notify) !== "false",
    plain: bool("plain"),
  };
  const hasMessage = Boolean(message.event || message.text);
  if (!message.event && !message.plain) {
    message.event = "Photo";
  }
  const caption = hasMessage ? formatRichMessage(message) : undefined;
  const result = await sendPhotoToChat(env, JSON.parse(chat), photo, caption, {
    disableNotification: message.notify === false,
  });
  context.res.status = result.ok ? 200 : 502;
  context.res.body = result;
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
    let webhookId: string;
    if (result == null) {
      const uuid = crypto.randomUUID();
      await env.TG_GROUPS.put(key, uuid);
      await env.TG_GROUPS.put(`webhook-chat:${uuid}`, chatKey);
      webhookId = uuid;
    } else {
      await env.TG_GROUPS.put(`webhook-chat:${result}`, chatKey);
      webhookId = result;
    }
    await sendToChat(
      env,
      chat,
      webhookReply(env.WEBHOOK_PREFIX, webhookId),
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
    disableLinkPreview?: boolean;
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
      link_preview_options: options?.disableLinkPreview
        ? { is_disabled: true }
        : undefined,
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

// Telegram caption limit is 1024 characters (after entity parsing). Longer
// captions are sent as a separate message right after the photo.
const CAPTION_LIMIT = 1024;

async function sendPhotoToChat(
  env: Env,
  chat: {
    chatId: number;
    messageThreadId?: number;
  },
  photo: string | Blob,
  caption?: string,
  options?: { disableNotification?: boolean }
): Promise<{ ok: boolean; error?: string }> {
  const longCaption = caption != null && caption.length > CAPTION_LIMIT;
  const form = new FormData();
  form.set("chat_id", String(chat.chatId));
  if (chat.messageThreadId != null) {
    form.set("message_thread_id", String(chat.messageThreadId));
  }
  if (typeof photo === "string") {
    form.set("photo", photo);
  } else {
    form.set("photo", photo, (photo as File).name || "photo");
  }
  if (caption && !longCaption) {
    form.set("caption", caption);
    form.set("parse_mode", "HTML");
  }
  if (options?.disableNotification) {
    form.set("disable_notification", "true");
  }
  const response = await fetch(
    `https://api.telegram.org/bot${env.BOT_TOKEN}/sendPhoto`,
    { method: "POST", body: form }
  );
  const body: any = await response.json().catch(() => ({}));
  if (!response.ok || !body.ok) {
    return { ok: false, error: body.description ?? `Telegram error ${response.status}` };
  }
  if (caption && longCaption) {
    await sendToChat(env, chat, caption, {
      parseMode: "HTML",
      disableNotification: options?.disableNotification,
    });
  }
  return { ok: true };
}
