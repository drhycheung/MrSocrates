# Getting an API key

MrSocrates is a *bring-your-own-key* (BYOK) app: you supply the API key, and all requests go directly from your browser to the provider you choose. Here is how to get a key from each supported provider.

**Recommended: Poe or OpenRouter.** These two work directly in the browser from this site. OpenAI, NVIDIA and Groq also work, but only with a server-side proxy (see [why](#why-only-poe-and-openrouter)).

## Poe (recommended — uses your Poe subscription points)

1. Create or sign in to a free account at [poe.com](https://poe.com).
2. Go to **poe.com/api/keys** and click **Create new key**, giving it a name (e.g. "MrSocrates").
3. Copy the key. It starts with `sk-poe-`.

> An active Poe subscription is needed to access most models. Requests made through your key are charged to your Poe subscription points.

## OpenRouter (recommended — pay-as-you-go, with free models)

1. Create an account at [openrouter.ai](https://openrouter.ai).
2. Go to **Keys** → **Create Key**, give it a name, and optionally set a credit limit.
3. Copy the key. It starts with `sk-or-`.

> No credit balance is needed — the free models work without any credits. Add credits only if you want access to the paid models too.

> **Free models:** OpenRouter free models end with `:free` at the end of the model name, e.g. `meta-llama/llama-3.3-70b-instruct:free`. In the app, type `free` in the model box to search for them.

> **Region note:** OpenAI models on OpenRouter are region-restricted and may not work from Hong Kong. Use a non-OpenAI model instead, such as `deepseek/deepseek-chat` or `meta-llama/llama-3.3-70b-instruct`.

## OpenAI

1. Sign up at [platform.openai.com](https://platform.openai.com) (note: this is separate from ChatGPT — it has its own billing).
2. Add a payment method under **Settings → Billing**.
3. Go to **Settings → API keys** → **Create new secret key**.
4. Copy the key immediately — it is shown only once. It starts with `sk-` or `sk-proj-`.

> ⚠️ OpenAI's API blocks browser requests (CORS), so it will not work directly from this static site — use Poe or OpenRouter instead, or add a server-side proxy.

## NVIDIA (free developer key)

1. Sign up for the free NVIDIA Developer Program at [build.nvidia.com](https://build.nvidia.com) (email only, no credit card).
2. Open any model page and click **Get API Key** (or go to **Settings → API keys** → **Generate**).
3. Copy the key. It starts with `nvapi-`.

> ⚠️ NVIDIA also blocks browser requests (CORS) — use Poe or OpenRouter from this site, or add a server-side proxy.

## Groq (free tier, very fast)

1. Sign up at [console.groq.com](https://console.groq.com) (no credit card required).
2. Go to **API Keys** → **Create API Key** and give it a name.
3. Copy the key. It starts with `gsk_`.

> ⚠️ Groq also blocks browser requests (CORS) — use Poe or OpenRouter from this site, or add a server-side proxy.

## Why only Poe and OpenRouter?

This site runs entirely in your browser with no backend. Browsers enforce CORS (Cross-Origin Resource Sharing), and only Poe and OpenRouter currently send the response headers needed for browser calls. OpenAI, NVIDIA and Groq keys are listed for completeness — they can be used with a small server-side proxy, or called directly from your own code and tools.