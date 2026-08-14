# MrSocrates

> **Purpose:** A small experiment in using a *bring-your-own-key* (BYOK) model to explore how AI apps can scale to large classes — or stay affordable when API costs are too high to cover centrally. A simple chatbot like this may not be the best case for BYOK, since there are still good free alternatives such as Google's Gemini GEM. But if the concept works, the same approach can be applied to more sophisticated apps in other projects.

A static, zero-backend BYOK (Bring Your Own Key) Socratic-tutor chatbot. Students plug in their own API key from a supported provider and chat with an AI professor that teaches the basics of a topic, then guides them with Socratic questions.

Host it anywhere that serves static files (GitHub Pages, Netlify, Cloudflare Pages, or a local `http.server`). No server, no database, no build step.

## Live site

https://drhycheung.github.io/MrSocrates/

## Features

- **BYOK** — each user enters their own API key in Settings; keys are stored only in the browser's `localStorage` and never leave the client.
- **Provider auto-detection** — the provider is detected from the key prefix and the correct base URL (and a default model) are set automatically:

  | Key prefix | Provider | Base URL |
  |---|---|---|
  | `sk-or-...` | OpenRouter | `https://openrouter.ai/api/v1` |
  | `sk-poe-...` | Poe | `https://api.poe.com/v1` |
  | `sk-...` / `sk-proj-...` | OpenAI | `https://api.openai.com/v1` |
  | `nvapi-...` | NVIDIA | `https://integrate.api.nvidia.com/v1` |
  | `gsk_...` | Groq | `https://api.groq.com/openai/v1` |

  > **Note:** only providers that send CORS headers work from a purely static site. OpenRouter and Poe are the reliable choices; OpenAI/NVIDIA/Groq block browser calls and will fail with a CORS error.

- **Key test** — a Test button sends a minimal request and shows a pass/fail indicator (including CORS/network errors) under the key field.
- **Model picker** — loads the provider's model list and offers a searchable dropdown.
- **Streaming chat** — tokens stream in as they arrive; Enter to send, Shift+Enter for a new line; stop button while generating.
- **Markdown rendering** — formatted output with copy buttons on code blocks.
- **Attachments** — attach images (for vision-capable models).
- **Voice input** — hold-to-record, release-to-send (Web Speech API).
- **Conversation persistence** — history and settings survive page reloads.
- **Clear conversation** — header button with a confirmation dialog.

## Getting an API key

Step-by-step instructions for every supported provider — [see GETTING-API-KEYS.md](GETTING-API-KEYS.md). Poe and OpenRouter are recommended because only they work directly from the browser.

On OpenRouter, free models end with `:free` at the end of the model name — type `free` in the model box to search for them.

## The prompt

The system prompt lives in `config.js` (`APP_CONFIG.systemPrompt`). It is sent with every message and defines the chatbot's behaviour:

> Serve like a Professor to discuss a topic with me. First teach me some basic knowledge in the field. Then switch to Socratic method to prompt me with questions (one at a time) to guide my thinking...

## Configuration (`config.js`)

| Key | Purpose |
|---|---|
| `title` | App name shown in the header and browser tab |
| `systemPrompt` | The system prompt sent on every request |
| `defaultBaseUrl` | Default API base URL (OpenAI by default) |
| `defaultModel` | Default model ID |
| `defaultTemperature` | Default sampling temperature |
| `welcomeMessage` | Text shown when there is no conversation yet |

Users can override the base URL, model, and temperature in Settings; overrides are persisted per browser.

## Local development

**No web server needed** — download all the files into a local folder and double-click `index.html` (or drag it into a browser). The app runs entirely in the browser.

For full functionality (especially voice input), serve it instead:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Then open **Settings**, paste an API key, press **Test**, pick a model, and chat. (Voice input needs a secure context, so it works on `localhost` or HTTPS but not when opening `index.html` directly from disk.)

## Deployment

The app is fully static — just upload the four files (`index.html`, `styles.css`, `config.js`, `app.js`) to any static host. For GitHub Pages:

```bash
git add .
git commit -m "Deploy MrSocrates"
git push origin main
```

then enable Pages for the repo. **Hard-refresh (Cmd+Shift+R) after deploying** to bypass cached JS — bump the `?v=` cache-buster on the `app.js`/`config.js` script tags whenever you update them.

## Security notes

- Keys are entered by users and stay in their own browser. Never hard-code a real API key into `config.js` for a public deployment.
- The app works best for BYOK because each student's key carries their own quota/billing on their chosen provider.
