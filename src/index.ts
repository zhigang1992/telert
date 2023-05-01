/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import {Telegraf} from "telegraf";
import {Application, Router} from "@cfworker/web";
import createTelegrafMiddleware from 'cfworker-middleware-telegraf'

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	TG_GROUPS: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
}

declare global {
	const BOT_TOKEN: string
	const SECRET_PATH: string
}

const bot = new Telegraf(BOT_TOKEN);

// Your code here, but do not `bot.launch()`
// Do not forget to set environment variables BOT_TOKEN and SECRET_PATH on your worker

const router = new Router();
router.post(`/${SECRET_PATH}`, createTelegrafMiddleware(bot));
new Application().use(router.middleware).listen();
