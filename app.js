(function () {
  "use strict";

  document.getElementById("app-title").textContent = APP_CONFIG.title;
  document.title = APP_CONFIG.title;

  const $ = (id) => document.getElementById(id);

  const els = {
    messages: $("messages"),
    input: $("input"),
    sendBtn: $("send-btn"),
    voiceBtn: $("voice-btn"),
    attachBtn: $("attach-btn"),
    fileInput: $("file-input"),
    previews: $("previews"),
    settingsBtn: $("settings-btn"),
    settingsModal: $("settings-modal"),
    apiKey: $("api-key"),
    baseUrl: $("base-url"),
    model: $("model"),
    temperature: $("temperature"),
    tempValue: $("temp-value"),
    toggleKey: $("toggle-key"),
    testKey: $("test-key"),
    testResult: $("test-result"),
    detectedHint: $("detected-hint"),
    modelHint: $("model-hint"),
    refreshModels: $("refresh-models"),
    modelList: $("model-list"),
    saveSettings: $("save-settings"),
    resetSettings: $("reset-settings"),
    clearChat: $("clear-chat"),
    exportChat: $("export-chat"),
    statusDot: $("status-dot"),
    clearBtn: $("clear-btn"),
    composerModel: $("composer-model"),
    composerModelInput: $("composer-model-input"),
    confirmModal: $("confirm-modal"),
    confirmTitle: $("confirm-title"),
    confirmMessage: $("confirm-message"),
    confirmOk: $("confirm-ok"),
    confirmCancel: $("confirm-cancel"),
  };

  const SETTINGS_KEY = "mrsocrates.settings.v4";
  const LEGACY_SETTINGS_KEY = "mrsocrates.settings";
  const OLD_DEFAULT_BASE_URLS = [
    "https://api.openai.com/v1",
    "https://maas.eduhk.hk/api/v1",
    "https://integrate.api.nvidia.com/v1",
  ];
  const OLD_DEFAULT_MODELS = ["gpt-4o-mini", "meta/llama-3.3-70b-instruct", "z-ai/glm-5.2"];
  const HISTORY_KEY = "mrsocrates.history";
  const PROVIDERS = [
    { prefix: /^sk-or-/i, baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4o-mini", name: "OpenRouter" },
    { prefix: /^sk-poe-/i, baseUrl: "https://api.poe.com/v1", model: "GPT-5.4", name: "Poe" },
    { prefix: /^nvapi-/i, baseUrl: "https://integrate.api.nvidia.com/v1", model: "meta/llama-3.3-70b-instruct", name: "NVIDIA" },
    { prefix: /^gsk_/i, baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile", name: "Groq" },
    { prefix: /^sk-/i, baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", name: "OpenAI" },
  ];
  const KNOWN_MODELS = ["gpt-4o-mini", "meta/llama-3.3-70b-instruct", "z-ai/glm-5.2", "openai/gpt-4o-mini", "GPT-5.4", "llama-3.3-70b-versatile"];

  function detectProvider(key) {
    return PROVIDERS.find(function (p) { return p.prefix.test(key); }) || null;
  }

  function describeFetchError(err) {
    if (err && err.message === "Failed to fetch") {
      return "Failed to fetch \u2014 blocked by the browser (CORS) or a privacy/ad-blocker extension. Try an incognito window or another browser.";
    }
    return err.message || String(err);
  }
  const IMAGE_MIME = /^image\/(png|jpe?g|webp|gif)$/;

  let settings = loadSettings();
  let conversation = loadHistory();
  let pendingImages = [];
  let streaming = false;
  let abortController = null;
  let recognition = null;
  let listening = false;

  function defaultSettings() {
    return {
      apiKey: "",
      baseUrl: APP_CONFIG.defaultBaseUrl,
      model: APP_CONFIG.defaultModel,
      temperature: APP_CONFIG.defaultTemperature,
      appId: APP_CONFIG.defaultAppId,
    };
  }

  function loadSettings() {
    let raw = null;
    try {
      raw = localStorage.getItem(SETTINGS_KEY) || localStorage.getItem(LEGACY_SETTINGS_KEY);
      if (raw && !localStorage.getItem(SETTINGS_KEY)) {
        const s = JSON.parse(raw);
        if (OLD_DEFAULT_BASE_URLS.indexOf(s.baseUrl) !== -1) {
          s.baseUrl = APP_CONFIG.defaultBaseUrl;
        }
        if (OLD_DEFAULT_MODELS.indexOf(s.model) !== -1) {
          s.model = APP_CONFIG.defaultModel;
        }
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
        localStorage.removeItem(LEGACY_SETTINGS_KEY);
      }
    } catch (e) {}
    try {
      if (raw) {
        return Object.assign(defaultSettings(), JSON.parse(raw));
      }
    } catch (e) {}
    return defaultSettings();
  }

  function resetSettings() {
    settings = defaultSettings();
    saveSettings();
    localStorage.removeItem(HISTORY_KEY);
    conversation = [];
    els.messages.innerHTML = "";
    renderEmptyState();
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    updateStatus();
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
      }
    } catch (e) {}
    return [];
  }

  function saveHistory() {
    const textOnly = conversation.map(function (m) {
      return { role: m.role, content: m.content, model: m.model };
    });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(textOnly));
  }

  function updateStatus() {
    if (settings.apiKey) {
      els.statusDot.classList.add("ready");
      els.statusDot.title = "API key configured";
    } else {
      els.statusDot.classList.remove("ready");
      els.statusDot.title = "Not configured";
    }
  }

  function updateComposerModel() {
    const model = settings.model || APP_CONFIG.defaultModel;
    els.composerModel.textContent = model;
    els.composerModel.style.display = model ? "" : "none";
    els.composerModelInput.hidden = true;
  }

  function showComposerModelEditor() {
    if (!settings.apiKey) {
      showToast("Set an API key in Settings first.");
      return;
    }
    els.composerModelInput.value = settings.model || APP_CONFIG.defaultModel;
    els.composerModelInput.hidden = false;
    els.composerModel.style.display = "none";
    els.composerModelInput.focus();
    els.composerModelInput.select();
    if (els.modelList.children.length === 0) {
      els.apiKey.value = settings.apiKey;
      els.baseUrl.value = settings.baseUrl || "";
      loadModels();
    }
  }

  function commitComposerModel() {
    const value = els.composerModelInput.value.trim();
    if (!value) {
      updateComposerModel();
      return;
    }
    settings.model = value;
    saveSettings();
    els.model.value = value;
    updateComposerModel();
    showToast("Model set to " + value);
  }

  function appendMessage(msg, opts) {
    conversation.push(msg);
    saveHistory();
    renderMessage(msg, opts);
  }

  function renderMessage(msg, opts) {
    opts = opts || {};
    if (msg.role === "user") {
      renderUserMessage(msg);
    } else if (msg.role === "assistant") {
      renderAssistantMessage(msg, opts.streaming);
    }
    scrollToBottom();
  }

  function renderUserMessage(msg) {
    const row = div("msg user");
    const bubble = div("bubble");
    (msg.images || []).forEach(function (src) {
      const img = document.createElement("img");
      img.src = src;
      img.className = "attachment";
      img.alt = "Attached image";
      bubble.appendChild(img);
    });
    const text = div("", msg.content);
    bubble.appendChild(text);
    row.appendChild(bubble);
    els.messages.appendChild(row);
  }

  function renderAssistantMessage(msg, isStreaming) {
    const row = div("msg assistant");
    const bubble = div("bubble");

    if (msg.model) {
      const tag = div("model-tag", msg.model);
      bubble.appendChild(tag);
    }

    if (isStreaming) {
      const text = div("cursor", "");
      bubble.appendChild(text);
      row.appendChild(bubble);
      els.messages.appendChild(row);
      scrollToBottom();
      return row;
    }

    const content = div("", "");
    bubble.appendChild(content);
    renderMarkdown(content, msg.content);

    const actions = div("msg-actions");
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", function () {
      navigator.clipboard.writeText(msg.content);
      copyBtn.textContent = "Copied";
      setTimeout(function () { copyBtn.textContent = "Copy"; }, 1500);
    });
    actions.appendChild(copyBtn);
    bubble.appendChild(actions);

    row.appendChild(bubble);
    els.messages.appendChild(row);
    scrollToBottom();
  }

  function renderMarkdown(container, text) {
    let html;
    if (typeof marked !== "undefined") {
      html = marked.parse(escapeHtml(text));
    } else {
      html = escapeHtml(text).replace(/\n/g, "<br>");
    }
    container.innerHTML = html;

    container.querySelectorAll("pre").forEach(function (pre) {
      const code = pre.querySelector("code");
      if (!code) return;

      const lang = code.className.match(/language-(\S+)/);
      const head = div("code-head");
      const label = document.createElement("span");
      label.textContent = lang ? lang[1] : "code";
      const btn = document.createElement("button");
      btn.className = "copy-btn";
      btn.textContent = "Copy";
      btn.addEventListener("click", function () {
        navigator.clipboard.writeText(code.textContent);
        btn.textContent = "Copied";
        setTimeout(function () { btn.textContent = "Copy"; }, 1500);
      });
      head.appendChild(label);
      head.appendChild(btn);
      pre.parentNode.insertBefore(head, pre);
    });
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function div(className, text) {
    const el = document.createElement("div");
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function scrollToBottom() {
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function scrollToBottomSoon() {
    requestAnimationFrame(scrollToBottom);
  }

  function buildApiMessages() {
    const out = [{ role: "system", content: APP_CONFIG.systemPrompt }];
    conversation.forEach(function (m) {
      if (m.role === "user") {
        if (m.images && m.images.length) {
          const parts = [{ type: "text", text: m.content }];
          m.images.forEach(function (src) {
            parts.push({ type: "image_url", image_url: { url: src } });
          });
          out.push({ role: "user", content: parts });
        } else {
          out.push({ role: "user", content: m.content });
        }
      } else if (m.role === "assistant" && m.content) {
        out.push({ role: "assistant", content: m.content });
      }
    });
    return out;
  }

  async function sendMessage() {
    if (streaming) {
      stopStreaming();
      return;
    }

    const text = els.input.value.trim();
    if (!text && pendingImages.length === 0) return;
    if (!settings.apiKey) {
      openSettings();
      showToast("Add your API key in Settings first.");
      return;
    }

    const images = pendingImages;
    pendingImages = [];
    els.previews.innerHTML = "";

    els.input.value = "";
    autosize();

    const userMsg = { role: "user", content: text, images: images };
    appendMessage(userMsg);

    const assistantMsg = { role: "assistant", content: "", model: settings.model };
    conversation.push(assistantMsg);
    saveHistory();

    const row = renderAssistantMessage(assistantMsg, true);
    const cursorEl = row.querySelector(".cursor");

    streaming = true;
    setComposerState();
    abortController = new AbortController();

    try {
      const res = await fetch(settings.baseUrl.replace(/\/+$/, "") + "/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + settings.apiKey,
        },
        body: JSON.stringify({
          model: settings.model,
          messages: buildApiMessages(),
          temperature: Number(settings.temperature),
          stream: true,
          ...(settings.appId ? { appId: settings.appId } : {}),
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        let detail = "";
        try {
          const err = await res.json();
          detail = err.error && (err.error.message || err.error.code) ? " " + (err.error.message || err.error.code) : "";
        } catch (e) {}
        throw new Error("Request failed (" + res.status + ") to " + res.url + detail);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamDone = false;
      let serverError = null;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (payload === "[DONE]") {
            buffer = "";
            streamDone = true;
            break;
          }
          try {
            const json = JSON.parse(payload);
            if (json.choices && json.choices[0]) {
              const delta = json.choices[0].delta ? json.choices[0].delta.content : "";
              if (delta) {
                assistantMsg.content += delta;
                cursorEl.textContent = assistantMsg.content;
                scrollToBottom();
              }
            } else if (json.error || json.message) {
              serverError = json.error && json.error.message ? json.error.message : json.message;
            }
          } catch (e) {}
        }
      }

      if (serverError) {
        throw new Error("Server error: " + serverError);
      }

      if (!assistantMsg.content.trim()) {
        assistantMsg.content = "The model returned an empty response.";
      }
    } catch (err) {
      if (err.name === "AbortError") {
        if (!assistantMsg.content.trim()) {
          assistantMsg.content = "(Generation stopped.)";
        }
      } else {
        const errMsg = describeFetchError(err);
        assistantMsg.content = "Error: " + errMsg;
        row.classList.add("error");
      }
    } finally {
      streaming = false;
      cursorEl.classList.remove("cursor");
      cursorEl.textContent = "";
      renderMarkdown(cursorEl, assistantMsg.content);
      setComposerState();
      saveHistory();
      abortController = null;
      scrollToBottomSoon();
    }
  }

  function stopStreaming() {
    if (abortController) abortController.abort();
  }

  function setComposerState() {
    els.sendBtn.disabled = streaming;
    els.sendBtn.innerHTML = streaming
      ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>'
      : '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3.4 20.4l17.45-7.48a1 1 0 0 0 0-1.84L3.4 3.6a.993.993 0 0 0-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z"/></svg>';
    els.sendBtn.title = streaming ? "Stop" : "Send";
  }

  function handleFiles(files) {
    Array.from(files).forEach(function (file) {
      if (!IMAGE_MIME.test(file.type)) {
        showToast("Only image files are supported.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast("Images must be under 5 MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = function () {
        pendingImages.push(reader.result);
        addPreview(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  function addPreview(src) {
    const wrap = div("preview");
    const img = document.createElement("img");
    img.src = src;
    img.alt = "Attachment preview";
    const remove = document.createElement("button");
    remove.className = "remove";
    remove.textContent = "\u00d7";
    remove.title = "Remove";
    remove.addEventListener("click", function () {
      const idx = pendingImages.indexOf(src);
      if (idx > -1) pendingImages.splice(idx, 1);
      wrap.remove();
    });
    wrap.appendChild(img);
    wrap.appendChild(remove);
    els.previews.appendChild(wrap);
  }

  function openSettings() {
    els.apiKey.value = settings.apiKey;
    els.baseUrl.value = settings.baseUrl;
    els.model.value = settings.model;
    els.temperature.value = settings.temperature;
    els.tempValue.textContent = settings.temperature;
    els.detectedHint.textContent = "";
    els.testResult.className = "test-result";
    els.testResult.innerHTML = "";
    els.settingsModal.classList.remove("hidden");
    els.apiKey.focus();
    if (settings.apiKey && detectProvider(settings.apiKey)) {
      loadModels();
    }
  }

  function closeSettings() {
    els.settingsModal.classList.add("hidden");
  }

  function saveSettingsFromForm() {
    settings.apiKey = els.apiKey.value.trim();
    settings.baseUrl = els.baseUrl.value.trim() || APP_CONFIG.defaultBaseUrl;
    settings.model = els.model.value.trim() || APP_CONFIG.defaultModel;
    settings.temperature = Number(els.temperature.value);
    saveSettings();
    updateComposerModel();
    closeSettings();
  }

  function setTestResult(kind, message) {
    els.testResult.className = "test-result" + (kind ? " " + kind : "");
    els.testResult.innerHTML = kind
      ? '<span class="dot"></span><span></span>'
      : "";
    if (kind) els.testResult.lastChild.textContent = message;
  }

  async function testApiKey() {
    const key = els.apiKey.value.trim();
    if (!key) {
      setTestResult("fail", "Enter a key first.");
      return;
    }
    const provider = detectProvider(key);
    if (!provider) {
      setTestResult("fail", "Unknown key format \u2014 set a provider or check the prefix.");
      return;
    }
    const baseUrl = (els.baseUrl.value.trim() || provider.baseUrl).replace(/\/+$/, "");
    const model = els.model.value.trim() || provider.model;

    els.testKey.disabled = true;
    setTestResult("pending", "Testing key\u2026");

    try {
      const res = await fetch(baseUrl + "/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + key,
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 16,
          stream: false,
        }),
      });
      if (res.ok) {
        setTestResult("ok", "Key works \u2014 " + provider.name + " accepted it.");
        loadModels();
      } else {
        let detail = "";
        try {
          const err = await res.json();
          detail = (err.error && err.error.message) || err.message || "";
        } catch (e) {}
        setTestResult("fail", "Key rejected (" + res.status + ")" + (detail ? ": " + detail : ""));
      }
    } catch (err) {
      setTestResult("fail", "Network / CORS error: " + describeFetchError(err));
    } finally {
      els.testKey.disabled = false;
    }
  }

  async function loadModels() {
    const key = els.apiKey.value.trim() || settings.apiKey || "";
    const provider = detectProvider(key);
    if (!provider) {
      els.modelHint.textContent = "Enter a recognized key to load its models.";
      return;
    }
    const baseUrl = (els.baseUrl.value.trim() || provider.baseUrl).replace(/\/+$/, "");

    els.refreshModels.disabled = true;
    els.modelHint.textContent = "Loading models\u2026";

    try {
      const headers = { "Content-Type": "application/json" };
      if (key) headers.Authorization = "Bearer " + key;
      const res = await fetch(baseUrl + "/models", { headers });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const ids = (data.data || []).map(function (m) { return m.id; });

      els.modelList.innerHTML = "";
      ids.slice(0, 300).forEach(function (id) {
        const opt = document.createElement("option");
        opt.value = id;
        els.modelList.appendChild(opt);
      });

      const current = els.model.value.trim();
      if (current && ids.indexOf(current) === -1) {
        const opt = document.createElement("option");
        opt.value = current;
        els.modelList.appendChild(opt);
      }

      els.modelHint.textContent = ids.length + " models available for " + provider.name + " (typing shows suggestions).";
    } catch (err) {
      els.modelHint.textContent = "Could not load models: " + (err.message || String(err));
    } finally {
      els.refreshModels.disabled = false;
    }
  }

  function initVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      els.voiceBtn.style.display = "none";
      return;
    }
    recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    let finalText = "";

    recognition.onresult = function (event) {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      els.input.value = (finalText + " " + interim).trim();
      autosize();
    };

    function stopRecording() {
      listening = false;
      els.voiceBtn.classList.remove("active");
      try { recognition.stop(); } catch (e) {}
    }

    recognition.onend = function () {
      listening = false;
      els.voiceBtn.classList.remove("active");
      if (finalText.trim()) {
        els.input.value = finalText.trim();
        autosize();
        sendMessage();
      }
      finalText = "";
    };

    recognition.onerror = function (event) {
      listening = false;
      els.voiceBtn.classList.remove("active");
      if (event.error !== "aborted" && event.error !== "no-speech") {
        showToast("Voice input error: " + event.error);
      }
      finalText = "";
    };

    function startRecording() {
      if (streaming) {
        showToast("Wait for the reply to finish before recording.");
        return;
      }
      finalText = "";
      try {
        recognition.start();
        listening = true;
        els.voiceBtn.classList.add("active");
      } catch (e) {
        showToast("Could not start voice input.");
      }
    }

    els.voiceBtn.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      startRecording();
    });

    els.voiceBtn.addEventListener("pointerup", function () {
      stopRecording();
    });

    els.voiceBtn.addEventListener("pointerleave", function () {
      stopRecording();
    });

    els.voiceBtn.addEventListener("contextmenu", function (e) {
      e.preventDefault();
    });
  }

  function autosize() {
    els.input.style.height = "auto";
    els.input.style.height = Math.min(els.input.scrollHeight, 160) + "px";
  }

  function clearChat() {
    conversation = [];
    els.messages.innerHTML = "";
    renderEmptyState();
    saveHistory();
  }

  function exportChat() {
    let out = "";
    conversation.forEach(function (m) {
      const who = m.role === "user" ? "You" : APP_CONFIG.title;
      out += "## " + who + "\n\n" + m.content + "\n\n";
    });
    const blob = new Blob([out], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "conversation.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  function renderEmptyState() {
    const el = div("empty-state");
    const h = document.createElement("h2");
    h.textContent = APP_CONFIG.title;
    const p = div("", APP_CONFIG.welcomeMessage);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-primary empty-settings-btn";
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>Settings';
    btn.addEventListener("click", openSettings);
    el.appendChild(h);
    el.appendChild(p);
    el.appendChild(btn);
    els.messages.appendChild(el);
  }

  let toastTimer = null;
  function showToast(msg) {
    let toast = $("toast");
    if (!toast) {
      toast = div("toast");
      toast.id = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("visible");
    }, 3000);
  }

  function askConfirm(title, message, okLabel, onConfirm) {
    els.confirmTitle.textContent = title;
    els.confirmMessage.textContent = message;
    els.confirmOk.textContent = okLabel;
    els.confirmModal.classList.remove("hidden");
    els.confirmOk.onclick = function () {
      closeConfirm();
      onConfirm();
    };
    els.confirmCancel.focus();
  }

  function closeConfirm() {
    els.confirmModal.classList.add("hidden");
    els.confirmOk.onclick = null;
  }

  els.sendBtn.addEventListener("click", sendMessage);
  els.attachBtn.addEventListener("click", function () { els.fileInput.click(); });
  els.fileInput.addEventListener("change", function () {
    handleFiles(els.fileInput.files);
    els.fileInput.value = "";
  });

  els.input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  els.input.addEventListener("input", autosize);

  els.settingsBtn.addEventListener("click", openSettings);
  els.clearBtn.addEventListener("click", function () {
    askConfirm(
      "Clear conversation",
      "Delete all messages and reset the context?",
      "Clear",
      clearChat
    );
  });
  els.confirmCancel.addEventListener("click", closeConfirm);
  els.confirmModal.querySelectorAll("[data-confirm-close]").forEach(function (el) {
    el.addEventListener("click", closeConfirm);
  });
  els.settingsModal.querySelectorAll("[data-close]").forEach(function (el) {
    el.addEventListener("click", closeSettings);
  });
  els.saveSettings.addEventListener("click", saveSettingsFromForm);
  els.temperature.addEventListener("input", function () {
    els.tempValue.textContent = els.temperature.value;
  });
  els.toggleKey.addEventListener("click", function () {
    els.apiKey.type = els.apiKey.type === "password" ? "text" : "password";
  });

  els.testKey.addEventListener("click", testApiKey);
  els.refreshModels.addEventListener("click", loadModels);

  els.apiKey.addEventListener("input", function () {
    setTestResult("", "");
    els.modelList.innerHTML = "";
    els.modelHint.textContent = "";
    const provider = detectProvider(els.apiKey.value.trim());
    if (provider) {
      els.baseUrl.value = provider.baseUrl;
      const currentModel = els.model.value.trim();
      if (!currentModel || KNOWN_MODELS.indexOf(currentModel) !== -1) {
        els.model.value = provider.model;
      }
      els.detectedHint.textContent = "Detected: " + provider.name + " (base URL set automatically).";
    } else {
      els.detectedHint.textContent = "";
    }
  });
  els.clearChat.addEventListener("click", function () {
    askConfirm(
      "Clear conversation",
      "Delete all messages and reset the context?",
      "Clear",
      function () {
        clearChat();
        closeSettings();
      }
    );
  });
  els.resetSettings.addEventListener("click", function () {
    resetSettings();
    closeSettings();
    showToast("Settings and history reset.");
  });
  els.exportChat.addEventListener("click", exportChat);

  els.composerModel.addEventListener("click", showComposerModelEditor);
  els.composerModelInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitComposerModel();
    } else if (e.key === "Escape") {
      e.preventDefault();
      updateComposerModel();
    }
  });
  els.composerModelInput.addEventListener("blur", commitComposerModel);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !els.settingsModal.classList.contains("hidden")) {
      closeSettings();
    }
  });

  function renderAll() {
    els.messages.innerHTML = "";
    if (conversation.length === 0) {
      renderEmptyState();
    } else {
      conversation.forEach(function (m) { renderMessage(m); });
    }
  }

  renderAll();
  updateStatus();
  updateComposerModel();
  setComposerState();
  initVoice();
})();