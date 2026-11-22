import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

// Webhook id and section live only in the URL hash (never sent to the server):
//   #id=<uuid>&api-photo  |  #id=<uuid>  |  #api-photo  |  #api
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORIGIN = 'https://telert.reily.app';
const BOT_URL = 'https://t.me/telerts_bot';

const parseHash = (hash: string) => {
  let id: string | undefined;
  let section = '';
  for (const part of hash.replace(/^#/, '').split('&')) {
    if (part.startsWith('id=')) {
      const value = decodeURIComponent(part.slice(3));
      if (ID_PATTERN.test(value)) id = value;
    } else if (part) {
      section = part;
    }
  }
  return { id, section };
};

const buildHash = (id: string | undefined, section: string) =>
  '#' + [id ? `id=${id}` : '', section].filter(Boolean).join('&');

// What the "Copy AI instructions" button copies.
const aiInstructions = (id: string | undefined) =>
  `Send Telegram notifications by POSTing JSON like {"event": "Deploy finished", "text": "v1.2 is live"} to ${ORIGIN}/t/${id ?? '<webhook-id>'}. ` +
  `${id ? '' : 'Get the webhook id by sending /webhook to @telerts_bot in Telegram. '}Full API: ${ORIGIN}/llms.txt`;

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
};

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (key: string, text: string) => {
    copyText(text);
    setCopied(key);
    setTimeout(() => setCopied((current) => (current === key ? null : current)), 1800);
  };
  return { copied, copy };
}

// ---- Telegram previews. Mirror formatRichMessage in src/message.ts. ----

type Msg = {
  event: string;
  text?: string;
  emoji?: string;
  channel?: string;
  metadata?: Record<string, string>;
  plain?: boolean;
};

// Telegram highlights #hashtags like links.
const Tag = ({ children }: { children: string }) => <span className="tg-tag">{children}</span>;

function renderMessage(m: Msg): React.ReactNode[] {
  if (m.plain) {
    return [<b key="t">{m.event}</b>, m.text ? `\n\n${m.text}` : ''];
  }
  const out: React.ReactNode[] = [];
  if (m.emoji) out.push(`${m.emoji} • `);
  if (m.channel) {
    out.push(<u key="c"><Tag>{`#${m.channel}`}</Tag></u>, '\n\n');
  }
  out.push(<b key="e">{m.event}</b>);
  if (m.text) out.push('\n\n', <span key="x" className="tg-mono">{m.text}</span>);
  const meta = Object.entries(m.metadata ?? {});
  if (meta.length) {
    out.push('\n\n');
    meta.forEach(([key, value], i) => {
      if (i) out.push('\n');
      out.push(<Tag key={`m${i}`}>{`#${key}`}</Tag>, `: ${value}`);
    });
  }
  return out;
}

const Time = () => <div className="time">12:00</div>;

const MessageBubble = ({ message }: { message: Msg }) => (
  <div className="bubble">
    <div className="body">{renderMessage(message)}</div>
    <Time />
  </div>
);

const PhotoBubble = ({ message }: { message: Msg }) => (
  <div className="bubble media">
    <div className="photo" aria-label="Your image">
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="400" height="300" fill="#9db4c4" />
        <circle cx="290" cy="90" r="30" fill="#e8eef2" />
        <path d="M0 300V200l90-70 80 60 70-40 160 90v60z" fill="#6f8a9c" />
        <path d="M0 300v-60l120-50 110 50 170-30v90z" fill="#52697a" />
      </svg>
    </div>
    <div className="body">{renderMessage(message)}</div>
    <Time />
  </div>
);

const FileBubble = ({ name, size }: { name: string; size: string }) => (
  <div className="bubble">
    <div className="doc">
      <div className="icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
        </svg>
      </div>
      <div>
        <div className="name">{name}</div>
        <div className="size">{size}</div>
      </div>
    </div>
    <Time />
  </div>
);

type Endpoint = {
  key: string;
  title: string;
  method: 'GET' | 'POST';
  url: string;
  desc: string;
  code: string;
  preview: React.ReactNode;
};

const endpoints: Endpoint[] = [
  {
    key: 'rich',
    title: 'Rich message',
    method: 'POST',
    url: '/t/{webhookId}',
    desc: 'Title, text, emoji, channel and metadata lines. Set notify to false to send silently.',
    code: `curl -X POST ${ORIGIN}/t/{webhookId} \\
  -H "Content-Type: application/json" \\
  -d '{
    "event": "New User Registered",
    "channel": "WebApp",
    "emoji": "👋",
    "text": "A new user just signed up!",
    "metadata": {
      "email": "user@example.com",
      "plan": "Pro"
    },
    "notify": true
  }'`,
    preview: (
      <MessageBubble
        message={{
          event: 'New User Registered',
          channel: 'WebApp',
          emoji: '👋',
          text: 'A new user just signed up!',
          metadata: { email: 'user@example.com', plan: 'Pro' },
        }}
      />
    ),
  },
  {
    key: 'plain',
    title: 'Plain message',
    method: 'POST',
    url: '/t/{webhookId}',
    desc: 'Same endpoint with "plain": true. A bold title and the text as normal paragraph text. Emoji, channel and metadata are not shown.',
    code: `curl -X POST ${ORIGIN}/t/{webhookId} \\
  -H "Content-Type: application/json" \\
  -d '{
    "event": "Deploy finished",
    "text": "v1.2 is live",
    "plain": true
  }'`,
    preview: <MessageBubble message={{ event: 'Deploy finished', text: 'v1.2 is live', plain: true }} />,
  },
  {
    key: 'get',
    title: 'Simple GET',
    method: 'GET',
    url: '/t/{webhookId}',
    desc: 'The same fields as query parameters, for scripts that can only make GET requests. Metadata is a URL-encoded JSON object.',
    code: `curl "${ORIGIN}/t/{webhookId}?event=Deploy&text=v1.2+Live&emoji=🚀"`,
    preview: <MessageBubble message={{ event: 'Deploy', text: 'v1.2 Live', emoji: '🚀' }} />,
  },
  {
    key: 'map',
    title: 'JSON mapping',
    method: 'POST',
    url: '/t/{webhookId}/map',
    desc: 'Forward a third-party webhook as is. Query values starting with $json are read from the request body (for example $json.repo.name). Add metadata with metadata.<key>=.',
    code: `curl -X POST "${ORIGIN}/t/{webhookId}/map?event=\\$json.action&text=\\$json.repo.name" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "push",
    "repo": { "name": "backend-api" }
  }'`,
    preview: <MessageBubble message={{ event: 'push', text: 'backend-api' }} />,
  },
  {
    key: 'file',
    title: 'File upload',
    method: 'POST',
    url: '/t/{webhookId}/file',
    desc: 'Send a text file, such as a log, as a Telegram document.',
    code: `curl -X POST ${ORIGIN}/t/{webhookId}/file \\
  -H "Content-Type: application/json" \\
  -d '{
    "fileName": "error.log",
    "content": "Stack trace details..."
  }'`,
    preview: <FileBubble name="error.log" size="22 B" />,
  },
  {
    key: 'photo',
    title: 'Send photo',
    method: 'POST',
    url: '/t/{webhookId}/photo',
    desc: 'Upload an image, or pass an image URL, with an optional caption. The caption takes the same fields as a rich message, including plain.',
    code: `curl -X POST ${ORIGIN}/t/{webhookId}/photo \\
  -F photo=@./image.jpg \\
  -F event="Boon" \\
  -F text="Message text" \\
  -F plain=true`,
    preview: <PhotoBubble message={{ event: 'Boon', text: 'Message text', plain: true }} />,
  },
];

const App = () => {
  const [hash, setHash] = useState(() => parseHash(window.location.hash));
  const { copied, copy } = useCopy();
  const { id } = hash;
  const fill = (text: string) => text.split('{webhookId}').join(id ?? '<webhook-id>');
  const instructions = aiInstructions(id);

  useEffect(() => {
    const onHashChange = () => setHash(parseHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Deep links: #api-photo scrolls to that endpoint, #api to the docs.
  useEffect(() => {
    if (hash.section) document.getElementById(hash.section)?.scrollIntoView();
  }, [hash.section]);

  // Plain anchor clicks would drop the id from the hash, so rebuild it.
  const goTo = (section: string) => (event: React.MouseEvent) => {
    event.preventDefault();
    window.location.hash = buildHash(id, section);
  };

  return (
    <>
      <header className="top">
        <div className="wrap">
          <a className="brand" href="#" onClick={(e) => { e.preventDefault(); window.scrollTo(0, 0); }}>Telert</a>
          <a href={BOT_URL}>@telerts_bot</a>
        </div>
      </header>

      <div className="wrap">
        <section className="intro">
          <h1>Telegram notifications from a URL</h1>
          <p className="lead">Send a request from any script or service, and it shows up in your Telegram chat.</p>
          <p>Add <a href={BOT_URL}>@telerts_bot</a> to a group and send <code>/webhook</code>. The bot replies with your webhook URL.</p>
          <div className="actions">
            <a className="btn primary" href={BOT_URL}>Open @telerts_bot</a>
            <button className="btn" onClick={() => copy('ai', instructions)}>
              {copied === 'ai' ? 'Copied' : 'Copy AI instructions'}
            </button>
          </div>
          <div className="ai-text">{instructions}</div>
          <p className="note">
            {id
              ? 'Your webhook ID is filled into the examples below. It stays in the URL hash and is never sent to the server.'
              : <>Paste the instructions into your coding agent. Open this page with <code>#id=&lt;webhook-id&gt;</code> to fill in your own URL.</>}
          </p>
        </section>

        <div className="docs" id="api">
          <nav aria-label="Endpoints">
            <h2>Endpoints</h2>
            <div className="links">
              {endpoints.map((ep) => (
                <a
                  key={ep.key}
                  href={`#api-${ep.key}`}
                  className={hash.section === `api-${ep.key}` ? 'on' : ''}
                  onClick={goTo(`api-${ep.key}`)}
                >
                  {ep.title}
                </a>
              ))}
            </div>
          </nav>

          <main>
            {endpoints.map((ep) => (
              <section key={ep.key} id={`api-${ep.key}`} className="ep">
                <h3>{ep.title}</h3>
                <div className="route">
                  <span className="method">{ep.method}</span>
                  <code>{fill(ep.url)}</code>
                </div>
                <p>{ep.desc}</p>
                <div className="codebox">
                  <pre>{fill(ep.code)}</pre>
                  <button className="copy" onClick={() => copy(ep.key, fill(ep.code))}>
                    {copied === ep.key ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="preview">
                  <div className="label">Preview in Telegram</div>
                  <div className="chat">{ep.preview}</div>
                </div>
              </section>
            ))}
          </main>
        </div>
      </div>
    </>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
