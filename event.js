(() => {
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("event") || "halloween-2026";
  const config = window.BOOHA_EVENTS?.[eventId] || window.BOOHA_EVENTS?.["halloween-2026"];
  const ghostParam = params.get("ghost");
  const storageKey = `booha:event-hunt:v1:${config.id}`;
  const normalizeText = (value) => String(value || "").trim().toUpperCase();
  const isTestCode = (value) => normalizeText(value) === normalizeText(config.testCode);

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const setBilingual = (selector, jp, en) => {
    const element = $(selector);
    if (!element) return;
    element.innerHTML = `<span class="jp-main">${jp}</span><span class="en-sub">${en}</span>`;
  };
  const createIconLink = (link, ariaPrefix = "") => {
    const anchor = document.createElement("a");
    const iconName = link.icon || "website";
    const iconLabel = iconName === "instagram" ? "Instagram" : iconName === "phone" ? "Phone" : iconName === "mail" ? "Mail" : "Website";
    anchor.href = link.url;
    anchor.target = "_blank";
    anchor.rel = "noopener";
    anchor.className = "icon-link";
    anchor.setAttribute("aria-label", (ariaPrefix ? ariaPrefix + ": " : "") + link.label + " " + iconLabel + "（新しいタブで開きます）");

    const ring = document.createElement("span");
    ring.className = "icon-ring";
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.classList.add("icon");
    icon.setAttribute("aria-hidden", "true");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#icon-" + iconName);
    icon.append(use);
    ring.append(icon);

    const label = document.createElement("span");
    label.className = "icon-label";
    const jp = document.createElement("span");
    jp.className = "jp-main";
    jp.textContent = link.label;
    const en = document.createElement("span");
    en.className = "en-sub";
    en.textContent = link.labelEN || link.label;
    if (en.textContent === jp.textContent) label.classList.add("is-single");
    label.append(jp, en);
    anchor.append(ring, label);
    return anchor;
  };

  const renderSocialLinks = (selector, links = []) => {
    const element = $(selector);
    if (!element) return;
    element.innerHTML = "";
    links.forEach((link) => element.append(createIconLink(link)));
  };

  const renderAfternoonPresenter = () => {
    const element = $("#afternoon-presenter");
    if (!element || !config.afternoonEvent) return;
    element.innerHTML = "";
    const label = document.createElement("div");
    label.className = "presented-by-label";
    const jp = document.createElement("span");
    jp.className = "jp-main";
    jp.textContent = "提供";
    const en = document.createElement("span");
    en.className = "en-sub";
    en.textContent = "Presented by";
    label.append(jp, en);
    const row = document.createElement("div");
    row.className = "presenter-links";
    const ariaPrefix = config.afternoonEvent.presentedByJP + " / " + config.afternoonEvent.presentedByEN;
    (config.afternoonEvent.presenterLinks || []).forEach((link) => row.append(createIconLink(link, ariaPrefix)));
    element.append(label, row);
  };

  const renderAfternoonFriends = () => {
    const element = $("#afternoon-friends-links");
    if (!element || !config.afternoonEvent) return;
    element.innerHTML = "";
    const ariaPrefix = "仲間のスクール / Our friends";
    (config.afternoonEvent.presenterLinks || []).forEach((link) => element.append(createIconLink(link, ariaPrefix)));
  };

  const renderParkingNote = () => {
    const element = $("#parking-note p");
    if (!element || !config.parking) return;
    element.innerHTML = "";
    const jpLines = config.parking.noteJP.split("\n");
    const enLines = config.parking.noteEN.split("\n");
    jpLines.forEach((line, index) => {
      const row = document.createElement("span");
      row.className = "parking-line " + (index < 2 ? "is-guide" : index === jpLines.length - 1 ? "is-liability" : "is-courtesy");
      const jp = document.createElement("span");
      jp.className = "jp-main";
      jp.textContent = line;
      const en = document.createElement("span");
      en.className = "en-sub";
      en.textContent = enLines[index] || "";
      row.append(jp, en);
      element.append(row);
    });
  };
  const startsAt = new Date(config.startAt).getTime();
  const latestStartAt = new Date(config.latestStartAt).getTime();
  const arrivalStartAt = new Date(config.arrivalStartAt).getTime();
  const parkingOpenAt = new Date(config.parkingOpenAt || config.arrivalStartAt).getTime();
  const candyEndAt = new Date(config.candyEndAt).getTime();
  const stayUntil = new Date(config.stayUntil).getTime();
  const zombieStartAt = new Date(config.zombieStartAt).getTime();

  const formatTime = (timestamp) => new Intl.DateTimeFormat("en-US", {
    timeZone: config.timeZone,
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(timestamp));

  const formatDateTime = (timestamp) => new Intl.DateTimeFormat("en-US", {
    timeZone: config.timeZone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(timestamp));

  const formatTimeJP = (timestamp) => new Intl.DateTimeFormat("ja-JP", {
    timeZone: config.timeZone, hour: "numeric", minute: "2-digit"
  }).format(new Date(timestamp));

  const formatDateJP = (timestamp) => new Intl.DateTimeFormat("ja-JP", {
    timeZone: config.timeZone, month: "long", day: "numeric", weekday: "short"
  }).format(new Date(timestamp));

  const formatDateEN = (timestamp) => new Intl.DateTimeFormat("en-US", {
    timeZone: config.timeZone, weekday: "long", month: "long", day: "numeric"
  }).format(new Date(timestamp));

  const renderCountdown = (element, milliseconds) => {
    const total = Math.floor(milliseconds / 1000);
    const units = [
      [Math.floor(total / 86400), "日", "days"],
      [Math.floor((total % 86400) / 3600), "時間", "hrs"],
      [Math.floor((total % 3600) / 60), "分", "min"],
      [total % 60, "秒", "sec"]
    ].filter(([value], index) => index > 0 || value > 0);
    element.classList.add("is-units");
    element.innerHTML = units.map(([value, jp, en]) =>
      `<span class="cd-unit"><b>${String(value).padStart(2, "0")}</b><small>${jp} · ${en}</small></span>`
    ).join("");
  };

  const readState = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (!stored) return null;
      if (Date.now() >= stored.expiresAt) {
        localStorage.removeItem(storageKey);
        return null;
      }
      return stored;
    } catch (error) {
      return null;
    }
  };

  const saveState = (state) => {
    state.updatedAt = Date.now();
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (error) { /* best effort */ }
  };

  const shuffle = (items) => {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      let random = Math.random();
      try {
        const bytes = new Uint32Array(1);
        crypto.getRandomValues(bytes);
        random = bytes[0] / 4294967296;
      } catch (error) { /* Math.random fallback */ }
      const swapIndex = Math.floor(random * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  };

  const ghostById = (id) => config.ghosts.find((ghost) => ghost.id === id);

  // Fallback tints (used if the browser cannot recolor the ghost image).
  const GHOST_FILTERS = {
    red: "none",
    pink: "hue-rotate(330deg) saturate(1.15)",
    yellow: "hue-rotate(58deg) saturate(1.35)",
    blue: "hue-rotate(170deg) saturate(1.2)",
    "light-blue": "hue-rotate(185deg) saturate(.85) brightness(1.18)",
    green: "hue-rotate(112deg) saturate(1.1)",
    "light-green": "hue-rotate(92deg) saturate(.95) brightness(1.1)",
    black: "grayscale(1) brightness(.22)",
    white: "grayscale(1) brightness(2.45)",
    orange: "hue-rotate(24deg) saturate(1.18)",
    purple: "hue-rotate(275deg) saturate(.95)",
    brown: "hue-rotate(6deg) saturate(.68) brightness(.68)"
  };


  const renderProgress = (state) => {
    const row = $("#candy-progress-dots");
    if (!row) return;
    const found = new Set(state?.found || []);
    row.innerHTML = "";
    config.ghosts.forEach((ghost) => {
      const dot = document.createElement("span");
      dot.className = `ghost-dot${found.has(ghost.id) ? " is-found" : ""}`;
      dot.style.setProperty("--dot-color", ghost.color);
      dot.setAttribute("aria-label", `${ghost.label}${found.has(ghost.id) ? " found" : " not found"}`);
      row.appendChild(dot);
    });
    row.setAttribute("aria-label", `${state?.nextIndex || 0} of ${config.ghosts.length} ghosts found`);
  };

  const setFeedback = (message, kind = "") => {
    const feedback = $("#prestart-feedback");
    if (!feedback) return;
    feedback.textContent = message;
    feedback.className = `feedback ${kind}`.trim();
  };

  /* ==========================================================
     CANDY FOREST LIVE HUNT — full-screen game
     ========================================================== */
  const TEST_TEAM_NAME = "テストチーム";
  const GHOST_TOTAL = config.ghosts.length;
  const POP = ["#ff5fa2", "#ffd23f", "#3ec1ff", "#7cdf64", "#b07cff", "#ff8a3d", "#ffffff"];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, reducedMotion ? Math.min(ms, 120) : ms));
  const game = $("#booha-game");
  const sprites = {};
  let spriteFallback = false;
  let spritesReady = null;
  let gameState = null;
  let busy = false;
  let wakeLock = null;

  const JOKERS = config.jokers || [];
  const jokerById = (id) => JOKERS.find((joker) => joker.id === id);
  const ghostJP = (ghost) => ghost.jp || ghost.kana || ghost.label;
  const ghostEN = (ghost) => ghost.label;

  /* colors */
  const hexToRgb = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
  const rgbToHex = (rgb) => "#" + rgb.map((value) => Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, "0")).join("");
  const mixColor = (a, b, t) => { const from = hexToRgb(a); const to = hexToRgb(b); return rgbToHex(from.map((value, index) => value + (to[index] - value) * t)); };
  const sceneColors = (ghost) => {
    if (ghost.id === "white") return { bg: "#ffd3e8", ray: "#ffbddc" };
    if (ghost.id === "black") return { bg: "#9f8fd6", ray: "#8c7bc9" };
    if (ghost.id === "yellow") return { bg: "#ffb8d6", ray: "#ffa3c9" };
    if (ghost.id === "light-green") return { bg: "#bfe3ff", ray: "#a9d8ff" };
    return { bg: mixColor(ghost.color, "#ffffff", .62), ray: mixColor(ghost.color, "#ffffff", .48) };
  };
  const applyScene = (element, ghost) => {
    const scene = sceneColors(ghost);
    element.style.setProperty("--c", ghost.color);
    element.style.setProperty("--bg", scene.bg);
    element.style.setProperty("--ray", scene.ray);
  };

  /* Recolor the red Booha render into every configured color (no extra image files). */
  const buildSprites = () => {
    if (spritesReady) return spritesReady;
    spritesReady = new Promise((resolve) => {
      const base = "assets/events/ghosts/booha-ghost-red.png";
      const useFallback = () => { spriteFallback = true; config.ghosts.forEach((ghost) => { sprites[ghost.id] = base; }); resolve(); };
      const image = new Image();
      image.onerror = useFallback;
      image.onload = () => {
        try {
          const scale = Math.min(1, 380 / Math.max(image.naturalWidth, image.naturalHeight));
          const width = Math.round(image.naturalWidth * scale);
          const height = Math.round(image.naturalHeight * scale);
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          context.drawImage(image, 0, 0, width, height);
          const source = context.getImageData(0, 0, width, height);
          // Trim the transparent margin so the ghost fills its box.
          let minX = width, minY = height, maxX = 0, maxY = 0;
          for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
            if (source.data[(y * width + x) * 4 + 3] > 24) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
          }
          if (maxX <= minX || maxY <= minY) { minX = 0; minY = 0; maxX = width - 1; maxY = height - 1; }
          const cropW = maxX - minX + 1, cropH = maxY - minY + 1;
          const out = document.createElement("canvas");
          out.width = cropW; out.height = cropH;
          const outContext = out.getContext("2d");
          config.ghosts.forEach((ghost) => {
            const tinted = context.createImageData(width, height);
            const s = source.data, d = tinted.data;
            const [tr, tg, tb] = hexToRgb(ghost.color);
            const lift = ghost.id === "black" ? 1.5 : 1;
            for (let i = 0; i < s.length; i += 4) {
              const r = s[i], g = s[i + 1], b = s[i + 2];
              d[i + 3] = s[i + 3];
              if (r - Math.max(g, b) > 70) {
                const shade = Math.pow(r / 242, 1.6) * lift;
                const highlight = Math.min(1, Math.max(0, (Math.min(g, b) - 18) / 120));
                let R = tr * shade, G = tg * shade, B = tb * shade;
                R += (255 - R) * highlight * .85; G += (255 - G) * highlight * .85; B += (255 - B) * highlight * .85;
                d[i] = R; d[i + 1] = G; d[i + 2] = B;
              } else { d[i] = r; d[i + 1] = g; d[i + 2] = b; }
            }
            context.putImageData(tinted, 0, 0);
            outContext.clearRect(0, 0, cropW, cropH);
            outContext.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
            sprites[ghost.id] = out.toDataURL("image/png");
          });
          resolve();
        } catch (error) { useFallback(); }
      };
      image.src = base;
    });
    return spritesReady;
  };
  const tintFor = (id) => (spriteFallback && GHOST_FILTERS[id] && GHOST_FILTERS[id] !== "none") ? GHOST_FILTERS[id] : "saturate(1)";
  const setGhostImage = (image, id) => {
    image.src = sprites[id];
    image.style.setProperty("--tint", tintFor(id));
  };
  const ghostImageTag = (id, className = "") => `<img class="${className}" src="${sprites[id]}" alt="" style="--tint:${tintFor(id)}">`;

  /* sound: Web Audio only, no files. The first tap unlocks it. */
  let audioContext = null;
  let soundOn = true;
  try { soundOn = localStorage.getItem("booha:sound") !== "off"; } catch (error) { /* default on */ }
  const audio = () => {
    if (!soundOn) return null;
    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      return audioContext;
    } catch (error) { return null; }
  };
  const tone = (frequency, offset, length, type = "sine", volume = .14, slideTo) => {
    const context = audio(); if (!context) return;
    const time = context.currentTime + offset;
    const oscillator = context.createOscillator(); const gain = context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, time);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, time + length);
    gain.gain.setValueAtTime(.0001, time); gain.gain.exponentialRampToValueAtTime(volume, time + .015); gain.gain.exponentialRampToValueAtTime(.0001, time + length);
    oscillator.connect(gain).connect(context.destination); oscillator.start(time); oscillator.stop(time + length + .05);
  };
  const noise = (offset, length, volume = .12) => {
    const context = audio(); if (!context) return;
    const size = Math.floor(context.sampleRate * length);
    const buffer = context.createBuffer(1, size, context.sampleRate); const channel = buffer.getChannelData(0);
    for (let i = 0; i < size; i += 1) channel[i] = (Math.random() * 2 - 1) * (1 - i / size);
    const source = context.createBufferSource(); const gain = context.createGain(); const filter = context.createBiquadFilter();
    filter.type = "bandpass"; filter.frequency.value = 900; source.buffer = buffer; gain.gain.value = volume;
    source.connect(filter).connect(gain).connect(context.destination); source.start(context.currentTime + offset);
  };
  const SFX = {
    tap: () => tone(880, 0, .08, "triangle", .08),
    boo: () => { tone(300, 0, .25, "square", .05, 700); tone(600, .05, .2, "sine", .06, 1200); },
    catch: () => { noise(0, .18, .2); [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .12 + i * .07, .32, "triangle", .13)); [2093, 2637, 3136].forEach((f, i) => tone(f, .55 + i * .06, .25, "sine", .05)); },
    drum: () => { for (let i = 0; i < 9; i += 1) noise(i * .07, .05, .06 + i * .012); tone(392, .68, .12, "square", .06); tone(784, .74, .4, "triangle", .14); },
    wrong: () => { tone(420, 0, .45, "sawtooth", .07, 90); tone(160, .05, .35, "square", .04, 70); },
    giggle: () => { [900, 1100, 950, 1200].forEach((f, i) => tone(f, .5 + i * .09, .07, "square", .03)); },
    joker: () => {
      // bike-horn honk, then a wobbly kazoo riff
      [0, .22].forEach((t) => { tone(330, t, .16, "sawtooth", .09, 290); tone(415, t, .16, "square", .05, 370); });
      const riff = [523, 494, 523, 659, 587, 523, 392, 440, 392, 523];
      riff.forEach((f, i) => tone(f, .55 + i * .13, .12, "square", .05, f * (i % 2 ? .94 : 1.06)));
      [880, 1175, 1568].forEach((f, i) => tone(f, 1.95 + i * .05, .3, "triangle", .06));
    },
    fanfare: () => { const notes = [523, 523, 523, 659, 784, 659, 784, 1047]; const times = [0, .12, .24, .36, .56, .76, .88, 1.05]; notes.forEach((f, i) => { const len = i === 7 ? .8 : .16; tone(f, times[i], len, "square", .06); tone(f * 2, times[i], len, "triangle", .06); }); }
  };
  const buzz = (pattern) => { try { if (navigator.vibrate && navigator.userActivation?.hasBeenActive !== false) navigator.vibrate(pattern); } catch (error) { /* optional */ } };
  const renderSoundButton = () => {
    const button = $("#g-sound"); if (!button) return;
    button.innerHTML = soundOn
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
    button.setAttribute("aria-pressed", String(soundOn));
  };
  const requestWakeLock = async () => {
    try { if (navigator.wakeLock && !wakeLock) { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.addEventListener("release", () => { wakeLock = null; }); } } catch (error) { /* optional */ }
  };

  /* particles: ambient sparkles and confetti */
  const fxCanvases = new Map();
  const getFx = (canvas) => { if (!fxCanvases.has(canvas)) fxCanvases.set(canvas, { canvas, context: canvas.getContext("2d"), parts: [], ambient: canvas.hasAttribute("data-ambient"), dpr: 1 }); return fxCanvases.get(canvas); };
  const sizeFx = (fx) => {
    const rect = fx.canvas.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (fx.canvas.width !== Math.round(rect.width * dpr) || fx.canvas.height !== Math.round(rect.height * dpr)) { fx.canvas.width = Math.round(rect.width * dpr); fx.canvas.height = Math.round(rect.height * dpr); }
    fx.dpr = dpr; fx.w = rect.width; fx.h = rect.height;
  };
  const drawStar = (context, x, y, radius, rotation) => {
    context.save(); context.translate(x, y); context.rotate(rotation); context.beginPath();
    for (let i = 0; i < 8; i += 1) { const r = i % 2 ? radius * .38 : radius; const a = i * Math.PI / 4; context.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    context.closePath(); context.fill(); context.restore();
  };
  let fxFrame = 0;
  const runFx = () => { if (!fxFrame) fxFrame = requestAnimationFrame(tickFx); };
  const burst = (canvas, x, y, colors, count = 90, power = 11) => {
    if (!canvas) return; const fx = getFx(canvas); sizeFx(fx); if (reducedMotion) count = Math.min(count, 20);
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2; const speed = power * (.35 + Math.random());
      fx.parts.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 4, g: .32, life: 1, decay: .006 + Math.random() * .01, size: 5 + Math.random() * 8, rot: Math.random() * 6, vr: (Math.random() - .5) * .4, color: colors[i % colors.length], shape: ["rect", "circle", "star"][i % 3] });
    }
    runFx();
  };
  const confettiRain = (canvas, colors, count = 70) => {
    if (!canvas || reducedMotion) return; const fx = getFx(canvas); sizeFx(fx);
    for (let i = 0; i < count; i += 1) fx.parts.push({ x: Math.random() * fx.w, y: -20 - Math.random() * fx.h * .6, vx: (Math.random() - .5) * 2, vy: 2 + Math.random() * 3, g: .05, life: 1, decay: .003, size: 6 + Math.random() * 7, rot: Math.random() * 6, vr: (Math.random() - .5) * .3, color: colors[i % colors.length], shape: i % 2 ? "rect" : "star" });
    runFx();
  };
  const tickFx = (time) => {
    fxFrame = 0; let alive = false;
    if (game.hidden) return;
    fxCanvases.forEach((fx) => {
      if (fx.canvas.closest("[hidden]")) { fx.parts = []; return; }
      sizeFx(fx); const context = fx.context;
      context.setTransform(fx.dpr, 0, 0, fx.dpr, 0, 0); context.clearRect(0, 0, fx.w, fx.h);
      if (fx.ambient && !reducedMotion) {
        if (!fx.amb) fx.amb = Array.from({ length: 26 }, () => ({ x: Math.random(), y: Math.random(), r: 3 + Math.random() * 7, s: .2 + Math.random() * .5, ph: Math.random() * 6, c: POP[Math.floor(Math.random() * 6)] }));
        fx.amb.forEach((a) => {
          a.y -= a.s / 1000; if (a.y < -.05) { a.y = 1.05; a.x = Math.random(); }
          context.globalAlpha = .55 + .45 * Math.sin(time / 500 + a.ph); context.fillStyle = a.c;
          drawStar(context, a.x * fx.w + Math.sin(time / 1200 + a.ph) * 12, a.y * fx.h, a.r * (.7 + .3 * Math.sin(time / 300 + a.ph)), time / 2000 + a.ph);
        });
        context.globalAlpha = 1; alive = true;
      }
      fx.parts = fx.parts.filter((p) => p.life > 0 && p.y < fx.h + 40);
      fx.parts.forEach((p) => {
        p.vx *= .985; p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= p.decay;
        context.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5)); context.fillStyle = p.color; context.strokeStyle = "#251034"; context.lineWidth = 1.5;
        if (p.shape === "star") drawStar(context, p.x, p.y, p.size, p.rot);
        else if (p.shape === "circle") { context.beginPath(); context.arc(p.x, p.y, p.size / 2, 0, 7); context.fill(); context.stroke(); }
        else { context.save(); context.translate(p.x, p.y); context.rotate(p.rot); context.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); context.strokeRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); context.restore(); }
      });
      context.globalAlpha = 1; if (fx.parts.length) alive = true;
    });
    if (alive) runFx();
  };
  $$("#booha-game canvas.fx").forEach((canvas) => getFx(canvas));

  /* game screens */
  const G_SCREENS = ["g-rules", "g-needstart", "g-hunt", "g-complete"];
  const G_OVERLAYS = ["g-catch", "g-reveal", "g-wrong", "g-joker"];
  const showScreen = (id) => { G_SCREENS.forEach((screen) => { $("#" + screen).hidden = screen !== id; }); runFx(); };
  const showOverlay = (id) => { G_OVERLAYS.forEach((overlay) => { $("#" + overlay).hidden = overlay !== id; }); runFx(); };
  const closeSheets = () => { $("#g-demo-sheet").hidden = true; $("#g-help-sheet").hidden = true; };
  const gameToast = (html) => { const toast = document.createElement("div"); toast.className = "g-toast"; toast.setAttribute("role", "status"); toast.innerHTML = html; game.appendChild(toast); setTimeout(() => toast.remove(), 2800); };
  const waitForTap = (element, ms) => new Promise((resolve) => {
    let done = false; let timer = 0;
    const finish = () => { if (done) return; done = true; element.removeEventListener("pointerdown", finish); clearTimeout(timer); resolve(); };
    element.addEventListener("pointerdown", finish);
    if (ms) timer = setTimeout(finish, ms);
  });
  const currentTarget = () => ghostById(gameState.order[gameState.found.length]);
  const formatClock = (timestamp, withSeconds) => new Intl.DateTimeFormat("ja-JP", { timeZone: config.timeZone, hour: "2-digit", minute: "2-digit", second: withSeconds ? "2-digit" : undefined, hour12: false }).format(new Date(timestamp));
  const applyTestOnly = () => { $$("#booha-game [data-test-only]").forEach((element) => { element.hidden = !gameState?.testMode; }); };

  const openGame = async () => {
    document.body.classList.add("game-open");
    game.hidden = false;
    renderSoundButton();
    await buildSprites();
    const loading = $("#g-loading"); if (loading) loading.hidden = true;
    requestWakeLock();
  };
  const closeGame = () => {
    closeScanner();
    game.hidden = true;
    document.body.classList.remove("game-open");
    closeSheets(); showOverlay(null);
    clearInterval(closeGame.completeTimer);
    try { wakeLock?.release(); } catch (error) { /* ignore */ }
    selectTab("candy");
    const shell = $(".hunt-shell"); if (shell) shell.scrollIntoView({ block: "center" });
  };

  const renderHunt = () => {
    const target = currentTarget(); const hunt = $("#g-hunt");
    applyScene(hunt, target);
    applyTestOnly();
    $("#g-team").textContent = gameState.participantLabel;
    $("#g-count").textContent = gameState.found.length;
    $("#g-target-name").innerHTML = ghostJP(target);
    $("#g-target-en").textContent = ghostEN(target);
    setGhostImage($("#g-hero"), target.id);
    $("#g-hero").alt = `${target.kana || target.label}のゴースト / ${target.label} ghost`;
    $("#g-find").innerHTML = `<span>${ghostJP(target)}のゴーストを<ruby>森<rt>もり</rt></ruby>でさがして、「スキャン」でQRコードを<ruby>読<rt>よ</rt></ruby>みとろう！</span><span class="en">Find the ${target.label.toLowerCase()} ghost in the forest, then tap Scan.</span>`;
    const slots = $("#g-slots"); slots.innerHTML = "";
    for (let i = 0; i < GHOST_TOTAL; i += 1) {
      const id = gameState.found[i];
      const slot = document.createElement("div");
      slot.className = `slot ${id ? "full" : "empty"}`; slot.dataset.index = i;
      const image = document.createElement("img"); image.alt = id ? ghostById(id).label : "";
      setGhostImage(image, id || "white");
      slot.appendChild(image); slots.appendChild(slot);
    }
  };

  const showReveal = async () => {
    const next = currentTarget(); const reveal = $("#g-reveal");
    reveal.style.setProperty("--c", next.color); reveal.classList.remove("open");
    setGhostImage($("#g-reveal-ghost"), next.id);
    $("#g-reveal-name").innerHTML = ghostJP(next); $("#g-reveal-name").style.setProperty("--c", next.color);
    $("#g-reveal-en").textContent = ghostEN(next);
    showOverlay("g-reveal"); SFX.drum();
    await sleep(750); reveal.classList.add("open"); buzz(30);
    await waitForTap(reveal, 4500);
    showOverlay(null); renderHunt(); showScreen("g-hunt");
  };

  const renderComplete = () => {
    applyTestOnly();
    $("#g-proof-team").textContent = gameState.participantLabel;
    $("#g-proof-start").textContent = formatClock(gameState.startedAt);
    $("#g-proof-end").textContent = formatClock(gameState.completedAt);
    const fooled = gameState.jokerScans || 0;
    $("#g-proof-jokers").textContent = fooled ? `${fooled}かい だまされた！` : "0かい！すごい！";
    const parade = $("#g-parade"); parade.innerHTML = "";
    const perRow = Math.ceil(GHOST_TOTAL / 2);
    gameState.found.forEach((id, i) => {
      const image = document.createElement("img"); image.className = "ghost-img thin"; image.alt = "";
      setGhostImage(image, id);
      const row = i < perRow ? 0 : 1; const col = i % perRow;
      image.style.left = `calc(${(col + .5 + row * .5) * (100 / (perRow + .5))}% - 29px)`;
      image.style.top = `${row * 54}px`; image.style.animationDelay = `${i * -.1}s`;
      parade.appendChild(image);
    });
    const tickNow = () => { if (!game.hidden && !$("#g-complete").hidden) $("#g-proof-now").textContent = formatClock(Date.now(), true); };
    tickNow(); clearInterval(closeGame.completeTimer); closeGame.completeTimer = setInterval(tickNow, 1000);
  };
  const showComplete = (celebrate) => {
    renderComplete(); showScreen("g-complete");
    const canvas = $("#g-complete-fx");
    if (celebrate) {
      SFX.fanfare(); buzz([60, 60, 60, 60, 200]);
      const rect = canvas.getBoundingClientRect();
      burst(canvas, rect.width / 2, rect.height * .55, POP, 140, 14);
      setTimeout(() => confettiRain(canvas, POP, 90), 500);
    }
    clearInterval(showComplete.rainTimer);
    showComplete.rainTimer = setInterval(() => { if (!game.hidden && !$("#g-complete").hidden) confettiRain(canvas, POP, 25); }, 4000);
  };

  const doCatch = async (ghost) => {
    const overlay = $("#g-catch"); applyScene(overlay, ghost); overlay.classList.remove("caught");
    setGhostImage($("#g-catch-ghost"), ghost.id);
    $("#g-stamp").classList.remove("show"); $("#g-catch-hint").hidden = false; $("#g-catch-bubble").hidden = false;
    showOverlay("g-catch"); SFX.boo();
    // This tap is the user gesture that lets sound and vibration play after a QR page load.
    await waitForTap(overlay);
    $("#g-catch-hint").hidden = true; $("#g-catch-bubble").hidden = true;
    overlay.classList.add("caught"); SFX.catch(); buzz([40, 30, 80]);
    const canvas = $("#g-catch-fx"); const rect = canvas.getBoundingClientRect();
    burst(canvas, rect.width / 2, rect.height / 2, [ghost.color, ghost.color, ...POP], 130, 13);
    await sleep(260); $("#g-stamp").classList.add("show");
    await sleep(1100);

    gameState.found.push(ghost.id);
    gameState.nextIndex = gameState.found.length;
    const finished = gameState.nextIndex >= GHOST_TOTAL;
    if (finished) gameState.completedAt = Date.now();
    saveState(gameState);

    if (finished) { showOverlay(null); showComplete(true); return; }
    renderHunt(); showScreen("g-hunt");
    const slot = $(`#g-slots .slot[data-index="${gameState.found.length - 1}"]`);
    if (slot && !reducedMotion) {
      const source = $("#g-catch-ghost"); const from = source.getBoundingClientRect(); const to = slot.getBoundingClientRect();
      const flyer = source.cloneNode();
      Object.assign(flyer.style, { position: "fixed", left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, zIndex: 30, animation: "none", margin: 0 });
      game.appendChild(flyer); overlay.hidden = true;
      try {
        await flyer.animate([
          { transform: "translate(0, 0) scale(1) rotate(0deg)" },
          { transform: `translate(${to.left + to.width / 2 - from.left - from.width / 2}px, ${to.top + to.height / 2 - from.top - from.height / 2}px) scale(${to.width / from.width}) rotate(360deg)` }
        ], { duration: 650, easing: "cubic-bezier(.5,-0.3,.6,1)" }).finished;
      } catch (error) { /* ignore */ }
      flyer.remove(); slot.classList.add("pop"); SFX.tap();
      burst($("#g-hunt canvas.fx"), to.left + to.width / 2, to.top + to.height / 2, [ghost.color, "#ffffff", "#ffd23f"], 24, 5);
      await sleep(450);
    }
    await showReveal();
  };

  const WRONG_LINES = [["ちがうよ〜！", "Nope, not me!"], ["ざんねん！", "Not this one!"], ["ハズレ〜！", "Wrong ghost!"], ["ぼくじゃないよ！", "It's not me!"]];
  const doWrong = async (ghost, alreadyFound) => {
    const overlay = $("#g-wrong"); applyScene(overlay, ghost); overlay.classList.remove("leave");
    const [jp, en] = alreadyFound ? ["もうつかまえたよ！", "You already caught me!"] : WRONG_LINES[Math.floor(Math.random() * WRONG_LINES.length)];
    $("#g-wrong-bubble").innerHTML = `${jp}<span class="en">${en}</span>`;
    setGhostImage($("#g-wrong-ghost"), ghost.id);
    const target = currentTarget();
    $("#g-wrong-target").innerHTML = `${ghostImageTag(target.id, "ghost-img thin")}<span>いまさがすのは ${ghostJP(target)}<span class="en">You're looking for ${target.label}</span></span>`;
    showOverlay("g-wrong"); SFX.wrong(); SFX.giggle(); buzz([20, 40, 20]);
    await waitForTap(overlay, 4000);
    overlay.classList.add("leave"); await sleep(450); showOverlay(null);
  };

  const JOKER_LINES = [
    ["ひっかかった〜！", "Gotcha!"],
    ["<ruby>偽物<rt>にせもの</rt></ruby>でした〜！", "I'm a fake!"],
    ["ジョーカーブーハー<br><ruby>参上<rt>さんじょう</rt></ruby>！", "Joker Booha is here!"],
    ["だまされた〜！", "Fooled you!"],
    ["ブーハーブーハー！<wbr>ハハハ！", "Booha booha! Ha ha ha!"]
  ];
  const doJoker = async (joker) => {
    const looksLike = ghostById(joker.looksLike) || config.ghosts[0];
    gameState.jokerScans = (gameState.jokerScans || 0) + 1;
    saveState(gameState);
    const overlay = $("#g-joker");
    const [jp, en] = JOKER_LINES[Math.floor(Math.random() * JOKER_LINES.length)];
    // Each phrase stays on one line; lines may only break at <br>/<wbr>.
    const keepPhrases = (html) => html.split(/(<br>|<wbr>)/).map((part) => (part === "<br>" || part === "<wbr>") ? part : `<span class="keep">${part}</span>`).join("");
    $("#g-joker-title").innerHTML = `${keepPhrases(jp)}<span class="en">${en}</span>`;
    setGhostImage($("#g-joker-ghost"), looksLike.id);
    const tellJP = joker.tellJP || "<ruby>名前<rt>なまえ</rt></ruby>と<ruby>目<rt>め</rt></ruby>をよく<ruby>見<rt>み</rt></ruby>てね！";
    const tellEN = joker.tellEN || "Check the name and the eyes!";
    $("#g-joker-caption").innerHTML = `${keepPhrases(`ぼくは「${joker.kana}」！<wbr>${tellJP}`)}<span class="en">I'm "${joker.label}"! ${tellEN}</span>`;
    $("#g-joker-tally").innerHTML = `ジョーカーにだまされた：${gameState.jokerScans}かい<span class="en">Fooled by jokers: ${gameState.jokerScans}</span>`;
    const target = currentTarget();
    $("#g-joker-target").innerHTML = `${ghostImageTag(target.id, "ghost-img thin")}<span><ruby>本物<rt>ほんもの</rt></ruby>は ${ghostJP(target)}<span class="en">The real one is ${target.label}</span></span>`;
    showOverlay("g-joker"); SFX.joker(); buzz([30, 40, 30, 40, 90]);
    const canvas = $("#g-joker-fx"); const rect = canvas.getBoundingClientRect();
    burst(canvas, rect.width / 2, rect.height * .45, ["#7a3cff", "#ffd23f", "#ff5fa2", "#7cdf64"], 110, 13);
    await sleep(900);
    await waitForTap(overlay, 6500);
    showOverlay(null);
  };

  const scanGhost = async (id) => {
    const ghost = ghostById(id);
    const joker = jokerById(id);
    if (!gameState || busy) return;
    if (joker && !gameState.completedAt) {
      busy = true; closeSheets();
      try { await doJoker(joker); } finally { busy = false; }
      return;
    }
    if (!ghost) { gameToast("このQRコードはつかえません<br><span style='opacity:.8'>This QR code isn't part of the hunt.</span>"); return; }
    if (gameState.completedAt) { showComplete(false); return; }
    busy = true; closeSheets();
    try {
      if (gameState.found.includes(ghost.id)) await doWrong(ghost, true);
      else if (ghost.id === currentTarget().id) await doCatch(ghost);
      else await doWrong(ghost, false);
    } finally { busy = false; }
  };


  /* In-page QR scanner: camera opens inside the game so the hunt stays in one browser. */
  const isInAppBrowser = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Line\/|MicroMessenger/i.test(navigator.userAgent);
  let scanStream = null;
  let scanFrame = 0;
  let scanDetector = null;
  let jsQRLoading = null;
  let scanSession = 0;
  const loadJsQR = () => {
    if (window.jsQR) return Promise.resolve();
    if (!jsQRLoading) {
      jsQRLoading = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "assets/vendor/jsqr-1.4.0.min.js";
        script.onload = () => resolve();
        script.onerror = () => { jsQRLoading = null; reject(new Error("jsQR failed to load")); };
        document.head.appendChild(script);
      });
    }
    return jsQRLoading;
  };
  const ghostIdFromScan = (text) => {
    try {
      const url = new URL(String(text).trim(), window.location.href);
      const id = url.searchParams.get("ghost");
      const scannedEvent = url.searchParams.get("event");
      if (scannedEvent && scannedEvent !== config.id) return null;
      return (ghostById(id) || jokerById(id)) ? id : null;
    } catch (error) { return null; }
  };
  const setScanMessage = (jp, en) => { $("#g-scan-msg").innerHTML = `${jp}<span class="en">${en}</span>`; };
  const stopCamera = () => {
    cancelAnimationFrame(scanFrame); scanFrame = 0;
    if (scanStream) { scanStream.getTracks().forEach((track) => track.stop()); scanStream = null; }
    const video = $("#g-video"); if (video) video.srcObject = null;
  };
  const closeScanner = () => { scanSession += 1; stopCamera(); $("#g-scanner").hidden = true; $("#g-scan-error").hidden = true; };
  const showScanError = (error) => {
    stopCamera();
    const denied = error && (error.name === "NotAllowedError" || error.name === "SecurityError");
    let jp, en;
    if (isInAppBrowser) {
      jp = "FacebookやLINEのアプリの<ruby>中<rt>なか</rt></ruby>では、カメラが<ruby>使<rt>つか</rt></ruby>えないことがあります。メニューから「ブラウザで<ruby>開<rt>ひら</rt></ruby>く」を<ruby>選<rt>えら</rt></ruby>んで、SafariかChromeで<ruby>開<rt>ひら</rt></ruby>いてください。";
      en = "The camera may not work inside the Facebook or LINE app. Use the menu to open this page in Safari or Chrome.";
    } else if (denied) {
      jp = "カメラが<ruby>許可<rt>きょか</rt></ruby>されていません。ブラウザの<ruby>設定<rt>せってい</rt></ruby>でカメラを<ruby>許可<rt>きょか</rt></ruby>してから、もう<ruby>一度<rt>いちど</rt></ruby>ためしてください。";
      en = "Camera access is blocked. Allow the camera in your browser settings, then try again.";
    } else {
      jp = "カメラを<ruby>開<rt>ひら</rt></ruby>けませんでした。スマホの「カメラ」アプリでQRコードを<ruby>読<rt>よ</rt></ruby>んでもOKです。";
      en = "The camera couldn't start. You can also scan the QR code with your phone's Camera app.";
    }
    $("#g-scan-error-text").innerHTML = `${jp}<span class="en">${en}</span>`;
    $("#g-scan-msg").innerHTML = "";
    $("#g-scan-error").hidden = false;
  };
  const openScanner = async () => {
    if (busy || !gameState || gameState.completedAt) return;
    closeSheets();
    const session = ++scanSession;
    const scanner = $("#g-scanner");
    const target = currentTarget();
    $("#g-scan-target").innerHTML = `${ghostImageTag(target.id, "ghost-img thin")}<span>${ghostJP(target)}のゴースト<span class="en">Looking for ${target.label}</span></span>`;
    $("#g-scan-error").hidden = true;
    scanner.hidden = false;
    setScanMessage("カメラをじゅんびしています…", "Starting the camera…");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { showScanError(null); return; }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } });
    } catch (error) { if (session === scanSession) showScanError(error); return; }
    if (session !== scanSession) { stream.getTracks().forEach((track) => track.stop()); return; }
    scanStream = stream;
    const video = $("#g-video");
    video.srcObject = stream;
    try { await video.play(); } catch (error) { /* autoplay with muted+playsinline normally works */ }
    if (!scanDetector && "BarcodeDetector" in window) {
      try { const formats = await window.BarcodeDetector.getSupportedFormats(); if (formats.includes("qr_code")) scanDetector = new window.BarcodeDetector({ formats: ["qr_code"] }); } catch (error) { scanDetector = null; }
    }
    if (!scanDetector) {
      try { await loadJsQR(); } catch (error) { if (session === scanSession) showScanError(error); return; }
    }
    if (session !== scanSession) return;
    setScanMessage("ゴーストのQRコードを<ruby>白<rt>しろ</rt></ruby>いわくに<ruby>入<rt>い</rt></ruby>れてね", "Fit the ghost's QR code inside the white frame");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    let lastRun = 0; let detecting = false; let warnedAt = 0;
    const step = async (time) => {
      if (session !== scanSession || !scanStream) return;
      scanFrame = requestAnimationFrame(step);
      if (time - lastRun < 110 || detecting || video.readyState < 2 || !video.videoWidth) return;
      lastRun = time; detecting = true;
      let text = null;
      try {
        if (scanDetector) {
          const codes = await scanDetector.detect(video);
          text = codes.length ? codes[0].rawValue : null;
        } else {
          const vw = video.videoWidth, vh = video.videoHeight;
          const side = Math.min(vw, vh) * .85;
          const size = Math.round(Math.min(720, side));
          canvas.width = size; canvas.height = size;
          context.drawImage(video, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, size, size);
          const code = window.jsQR(context.getImageData(0, 0, size, size).data, size, size, { inversionAttempts: "dontInvert" });
          text = code ? code.data : null;
        }
      } catch (error) { text = null; }
      detecting = false;
      if (!text || session !== scanSession) return;
      const id = ghostIdFromScan(text);
      if (!id) {
        if (time - warnedAt > 2500) { warnedAt = time; setScanMessage("このQRコードはハントのものではありません", "That QR code isn't one of the hunt ghosts"); }
        return;
      }
      closeScanner();
      scanGhost(id);
    };
    scanFrame = requestAnimationFrame(step);
  };

  /* Candy Forest page: name entry before a hunt, Continue after */
  const renderCandyPanel = (state) => {
    const startView = $("#hunt-start"); const resumeView = $("#hunt-resume");
    if (!startView || !resumeView) return;
    startView.hidden = Boolean(state);
    resumeView.hidden = !state;
    if (!state) return;
    const complete = Boolean(state.completedAt);
    $("#resume-label-jp").textContent = complete ? "コンプリート！" : "ハントのとちゅうです";
    $("#resume-label-en").textContent = complete ? "Hunt complete!" : "Your hunt is in progress";
    $("#resume-count").textContent = `${state.found.length} / ${GHOST_TOTAL}`;
    $("#resume-team").textContent = state.participantLabel;
    $("#resume-hunt-jp").textContent = complete ? "完了画面を見る" : "つづける";
    $("#resume-hunt-en").textContent = complete ? "Show the completion screen" : "Continue the hunt";
    $("#resume-reset").hidden = !state.testMode;
  };

  const startButtonCountdown = (milliseconds) => {
    const total = Math.max(0, Math.floor(milliseconds / 1000));
    const days = Math.floor(total / 86400); const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60); const seconds = total % 60;
    if (days > 0) return { jp: `${days}日${hours}時間`, en: `${days}d ${hours}h` };
    const clock = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    return { jp: clock, en: clock };
  };
  const renderStartButton = (now) => {
    const button = $("#start-hunt"); if (!button) return;
    const testMode = isTestCode($("#participant-name")?.value);
    const open = now >= startsAt && now < latestStartAt;
    let jp, en;
    if (testMode) { jp = "テストをはじめる"; en = "Start test"; }
    else if (now < startsAt) { const left = startButtonCountdown(startsAt - now); jp = `あと <span class="start-time">${left.jp}</span> でスタート`; en = `Opens at ${formatTime(startsAt)} · <span class="start-time">${left.en}</span>`; }
    else if (open) { jp = "スタート！"; en = "Start the hunt"; }
    else { jp = "受付は終了しました"; en = "Check-in has closed"; }
    button.disabled = !testMode && !open;
    button.classList.toggle("is-ready", testMode || open);
    button.classList.toggle("is-test", testMode);
    $("#start-hunt-jp").innerHTML = jp;
    $("#start-hunt-en").innerHTML = en;
  };

  const updateStatus = () => {
    const now = Date.now();
    const countdown = $("#countdown");
    const startButton = $("#start-hunt");
    const remaining = (timestamp) => Math.max(0, timestamp - now);
    const duration = (milliseconds) => {
      const totalSeconds = Math.floor(milliseconds / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      if (days > 0) return `${days}d ${String(hours).padStart(2, "0")}h`;
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    };

    const infoCountdown = $("#info-countdown");
    if (infoCountdown) {
      const infoLabelJP = $("#info-countdown-label-jp");
      const infoLabelEN = $("#info-countdown-label-en");
      if (now < startsAt) {
        infoLabelJP.textContent = "キャンディの森 スタートまで";
        infoLabelEN.textContent = "Candy Forest opens in";
        renderCountdown(infoCountdown, remaining(startsAt));
      } else if (now < candyEndAt) {
        infoLabelJP.textContent = "キャンディの森 開催中！";
        infoLabelEN.textContent = "Candy Forest is on!";
        infoCountdown.classList.remove("is-units");
        infoCountdown.textContent = now < latestStartAt
          ? "受付は11:00まで / Check-in until 11:00"
          : "12:00まで / Until 12:00";
      } else if (now < stayUntil) {
        infoLabelJP.textContent = "午後のイベント開催中";
        infoLabelEN.textContent = "Afternoon Events are on";
        infoCountdown.classList.remove("is-units");
        infoCountdown.textContent = "16:00まで / Until 4:00 pm";
      } else if (now < zombieStartAt) {
        infoLabelJP.textContent = "ゾンビ・スカベンジャーハントまで";
        infoLabelEN.textContent = "Zombie Scavenger Hunt starts in";
        renderCountdown(infoCountdown, remaining(zombieStartAt));
      } else {
        infoLabelJP.textContent = "ゾンビ・スカベンジャーハント開催中！";
        infoLabelEN.textContent = "Zombie Scavenger Hunt is underway!";
        infoCountdown.classList.remove("is-units");
        infoCountdown.textContent = "開催中！ / Happening now!";
      }
    }

    if (now < startsAt) {
      const parkingOpen = now >= parkingOpenAt;
      $("#candy-status-label-jp").textContent = "キャンディの森 スタートまで";
      $("#candy-status-label-en").textContent = "Candy Forest opens in";
      renderCountdown(countdown, remaining(startsAt));
      $("#candy-status-copy-jp").textContent = parkingOpen
        ? `駐車場は開いています。ハントは${formatTimeJP(startsAt)}に始まります。`
        : `${formatDateJP(startsAt)} ${formatTimeJP(startsAt)}スタート。駐車場は${formatTimeJP(parkingOpenAt)}から、ハントは${formatTimeJP(startsAt)}から始められます。`;
      $("#candy-status-copy-en").textContent = parkingOpen
        ? `Parking is open. The hunt starts at ${formatTime(startsAt)}.`
        : `${formatDateEN(startsAt)} at ${formatTime(startsAt)}. Parking opens at ${formatTime(parkingOpenAt)}; families can start the hunt from ${formatTime(startsAt)}.`;
    } else if (now < latestStartAt) {
      $("#candy-status-label-jp").textContent = "受付中";
      $("#candy-status-label-en").textContent = "Check-in open";
      countdown.classList.remove("is-units");
      countdown.textContent = duration(remaining(latestStartAt));
      $("#candy-status-copy-jp").textContent = "11:00まで新しく始められます。キャンディの森は12:00までです。";
      $("#candy-status-copy-en").textContent = "New families may start until 11:00. The Candy Forest ends at 12:00.";
    } else if (now < candyEndAt) {
      $("#candy-status-label-jp").textContent = "受付終了・ハント中";
      $("#candy-status-label-en").textContent = "Check-in closed — hunt in progress";
      countdown.classList.remove("is-units");
      countdown.textContent = duration(remaining(candyEndAt));
      $("#candy-status-copy-jp").textContent = "始めたハントは12:00まで続けられます。";
      $("#candy-status-copy-en").textContent = "Hunts already started can continue until 12:00.";
    } else if (now < stayUntil) {
      $("#candy-status-label-jp").textContent = "キャンディの森は終了しました";
      $("#candy-status-label-en").textContent = "The Candy Forest has ended";
      countdown.classList.remove("is-units");
      countdown.textContent = "—";
      $("#candy-status-copy-jp").textContent = "ピクニックエリアで午後のイベント（16:00まで）。";
      $("#candy-status-copy-en").textContent = "Afternoon Events are on in the picnic area until 4:00 pm.";
    } else {
      $("#candy-status-label-jp").textContent = "昼の部は終了";
      $("#candy-status-label-en").textContent = "Daytime events are over";
      countdown.classList.remove("is-units");
      countdown.textContent = "—";
      $("#candy-status-copy-jp").textContent = "ゾンビ・スカベンジャーハントは18:00からです（18:00までに受付）。";
      $("#candy-status-copy-en").textContent = "The Zombie Scavenger Hunt starts at 6:00 pm — check in by 6:00 pm.";
    }

    renderStartButton(now);
    const state = readState();
    renderCandyPanel(state);
    renderProgress(state);
  };

  const startHunt = async () => {
    const input = $("#participant-name");
    const name = input.value.trim();
    if (!name) {
      input.focus();
      input.setCustomValidity("チームの名前を入れてください。 / Enter a family or team name.");
      input.reportValidity();
      return;
    }
    input.setCustomValidity("");
    const testMode = isTestCode(name);
    const now = Date.now();
    if (!testMode && (now < startsAt || now >= latestStartAt)) return;
    audio(); SFX.tap();
    gameState = {
      schemaVersion: 1,
      eventId: config.id,
      participantLabel: testMode ? TEST_TEAM_NAME : name,
      testMode,
      order: testMode ? config.ghosts.map((ghost) => ghost.id) : shuffle(config.ghosts.map((ghost) => ghost.id)),
      found: [],
      nextIndex: 0,
      startedAt: now,
      updatedAt: now,
      expiresAt: now + (testMode ? config.testHuntDurationHours : config.huntDurationHours) * 60 * 60 * 1000,
      completedAt: null
    };
    saveState(gameState);
    setFeedback("");
    updateStatus();
    await openGame();
    $("#g-welcome-team").textContent = `ようこそ、${gameState.participantLabel}！`;
    applyTestOnly(); showOverlay(null); showScreen("g-rules");
  };

  const resumeHunt = async () => {
    gameState = readState();
    if (!gameState) { updateStatus(); return; }
    audio();
    await openGame();
    applyTestOnly(); showOverlay(null);
    if (gameState.completedAt) showComplete(false);
    else { renderHunt(); showScreen("g-hunt"); }
  };

  const resetTestHunt = () => {
    try { localStorage.removeItem(storageKey); } catch (error) { /* best effort */ }
    gameState = null;
    if (!game.hidden) closeGame();
    $("#participant-name").value = config.testCode;
    updateStatus();
    setFeedback("テストをリセットしました。 / Test reset. Press Start.", "is-muted");
  };

  // A QR scan opens event.html?event=…&ghost=<color>. Open the game straight away.
  const bootFromScan = async () => {
    if (!ghostParam) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("ghost");
      history.replaceState(null, "", `${url.pathname}${url.search}#candy`);
    } catch (error) { /* keep URL */ }
    gameState = readState();
    await openGame();
    showOverlay(null);
    if (!gameState) {
      const lookId = ghostById(ghostParam) ? ghostParam : (jokerById(ghostParam)?.looksLike || config.ghosts[0].id);
      setGhostImage($("#g-needstart-ghost"), lookId);
      showScreen("g-needstart");
      return;
    }
    applyTestOnly();
    if (gameState.completedAt) { showComplete(false); return; }
    renderHunt(); showScreen("g-hunt");
    scanGhost(ghostParam);
  };

  const selectTab = (tabName, updateHash = true) => {
    $$(".tab").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === tabName));
    $$(".tab-panel").forEach((panel) => {
      const active = panel.dataset.panel === tabName;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
    document.body.dataset.theme = tabName === "afternoon" ? "info" : tabName;
    if (updateHash && window.location.hash !== `#${tabName}`) history.replaceState(null, "", `#${tabName}`);
    updateStatus();
  };

  const formatYen = (amount) => `¥${Number(amount).toLocaleString("en-US")}`;
  const prices = config.prices || { candy: 1000, zombie: 1000 };
  const bothPrice = prices.candy + prices.zombie;
  const reservationEmail = config.reservationEmail || config.contacts.email;
  const reservationBody = [
    "1. 代表者のお名前 / Your name:",
    "",
    "2. 参加するイベント / Events:",
    "   キャンディの森 / ゾンビ・スカベンジャーハント / 両方",
    "",
    "3. 参加するお子さま全員のお名前・学年・年齢:",
    "   ※お名前はローマ字でご記入ください。",
    "   ※参加するお子さまは、参加するイベントのバッグを購入してください。キャンディの森はキャンディバッグ、ゾンビ・スカベンジャーハントはグッズバッグです。",
    "",
    "4. バッグの個数 / Number of bags:",
    "",
    "5. 参加する保護者を含む大人の人数 / Number of all adults attending:"
  ].join("\n");
  const reservationHref = `mailto:${reservationEmail}?subject=${encodeURIComponent("ハロウィンイベント予約 / Halloween Event reservation")}&body=${encodeURIComponent(reservationBody)}`;

  ["#hero-reserve-link", "#reservation-link"].forEach((selector) => {
    const link = $(selector);
    if (link) link.href = reservationHref;
  });
  $("#info-candy-price").textContent = formatYen(prices.candy);
  $("#info-zombie-price").textContent = formatYen(prices.zombie);
  $("#info-candy-card-price").textContent = `キャンディバッグ ${formatYen(prices.candy)}`;
  $("#info-zombie-card-price").textContent = `グッズバッグ ${formatYen(prices.zombie)}`;
  $("#info-both-price").textContent = formatYen(bothPrice);
  $("#info-both-price-en").textContent = formatYen(bothPrice);
  setBilingual("#info-candy-eligibility", config.eligibility.candyJP, config.eligibility.candyEN);
  setBilingual("#info-candy-price-eligibility", config.eligibility.candyJP, config.eligibility.candyEN);
  setBilingual("#info-zombie-eligibility", config.eligibility.zombieJP, config.eligibility.zombieEN);
  setBilingual("#info-zombie-price-eligibility", config.eligibility.zombieJP, config.eligibility.zombieEN);
  setBilingual("#rain-notice-copy", config.rain.jp, config.rain.en);
  renderSocialLinks("#rain-notice-links", config.rain.socialLinks);
  renderSocialLinks("#contact-social-links", config.rain.socialLinks);
  renderSocialLinks("#candy-rain-links", config.rain.socialLinks);
  renderSocialLinks("#zombie-social-links", config.rain.socialLinks);
  renderAfternoonPresenter();
  renderAfternoonFriends();
  $("#parking-company-jp").textContent = config.parking.companyJP || config.parking.addressJP || "";
  $("#parking-street-jp").textContent = config.parking.streetJP || "";
  $("#parking-address-en").textContent = config.parking.addressEN;
  renderParkingNote();
  $("#parking-map-link").href = config.parking.mapUrl;
  $("#reservation-email").textContent = reservationEmail;
  $("#info-email-link").href = `mailto:${reservationEmail}`;
  $("#info-phone-link").href = `tel:${config.contacts.phone.replace(/\D/g, "")}`;
  $("#contact-address").textContent = config.contacts.addressJP;

  $$(".tab").forEach((tab) => tab.addEventListener("click", () => selectTab(tab.dataset.tab)));
  $$('[data-go-tab]').forEach((button) => button.addEventListener("click", () => { selectTab(button.dataset.goTab); window.scrollTo({ top: 0, behavior: "smooth" }); }));
  $("#start-hunt").addEventListener("click", startHunt);
  $("#participant-name").addEventListener("input", (event) => {
    event.target.setCustomValidity("");
    updateStatus();
  });
  $("#participant-name").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !$("#start-hunt").disabled) startHunt();
  });
  $("#resume-hunt").addEventListener("click", resumeHunt);
  $("#resume-reset").addEventListener("click", resetTestHunt);
  $("#g-go").addEventListener("click", async () => {
    if (busy || !gameState) return;
    busy = true;
    SFX.tap(); requestWakeLock();
    renderHunt(); $("#g-rules").hidden = true;
    try { await showReveal(); } finally { busy = false; }
  });
  $("#g-needstart-go").addEventListener("click", () => { closeGame(); $("#participant-name")?.focus(); });
  $("#g-info").addEventListener("click", closeGame);
  $("#g-complete-info").addEventListener("click", closeGame);
  $("#g-complete-reset").addEventListener("click", resetTestHunt);
  $("#g-demo-reset").addEventListener("click", resetTestHunt);
  $("#g-sound").addEventListener("click", () => {
    soundOn = !soundOn;
    try { localStorage.setItem("booha:sound", soundOn ? "on" : "off"); } catch (error) { /* optional */ }
    renderSoundButton();
    if (soundOn) SFX.tap();
  });
  $("#g-hero").addEventListener("click", (event) => {
    const hero = event.currentTarget;
    hero.classList.remove("boo"); void hero.offsetWidth; hero.classList.add("boo");
    SFX.boo(); buzz(15);
    const rect = hero.getBoundingClientRect();
    burst($("#g-hunt canvas.fx"), rect.left + rect.width / 2, rect.top + rect.height * .3, [currentTarget().color, "#ffffff"], 16, 6);
  });
  $("#g-hero").addEventListener("animationend", (event) => { if (event.animationName === "gBoo") event.currentTarget.classList.remove("boo"); });
  $("#g-demo").addEventListener("click", () => {
    if (!gameState?.testMode) return;
    closeSheets();
    const chips = $("#g-chips"); chips.innerHTML = "";
    config.ghosts.forEach((ghost) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = `chip${gameState.found.includes(ghost.id) ? " got" : ""}`;
      chip.innerHTML = `${ghostImageTag(ghost.id, "ghost-img thin")}<span>${ghost.kana || ghost.label}</span>`;
      chip.setAttribute("aria-label", ghost.label);
      chip.addEventListener("click", () => scanGhost(ghost.id));
      chips.appendChild(chip);
    });
    const jokerChips = $("#g-joker-chips"); jokerChips.innerHTML = "";
    JOKERS.forEach((joker) => {
      const chip = document.createElement("button");
      chip.type = "button"; chip.className = "chip";
      chip.innerHTML = `${ghostImageTag(joker.looksLike, "ghost-img thin")}<span>${joker.kana}</span>`;
      chip.setAttribute("aria-label", `Joker ${joker.label}`);
      chip.addEventListener("click", () => scanGhost(joker.id));
      jokerChips.appendChild(chip);
    });
    $("#g-demo-sheet").hidden = false;
  });
  $("#g-demo-correct").addEventListener("click", () => { if (gameState?.testMode && !gameState.completedAt) scanGhost(currentTarget().id); });
  $("#g-demo-close").addEventListener("click", closeSheets);
  $("#g-scan").addEventListener("click", () => { SFX.tap(); openScanner(); });
  $("#g-scan-close").addEventListener("click", closeScanner);
  $("#g-scan-error-close").addEventListener("click", closeScanner);
  $("#g-scan-retry").addEventListener("click", openScanner);
  const inAppWarning = $("#inapp-warning");
  if (inAppWarning) inAppWarning.hidden = !isInAppBrowser;
  $("#g-help").addEventListener("click", () => { $("#g-paste-err").textContent = ""; $("#g-help-sheet").hidden = false; });
  $("#g-help-close").addEventListener("click", closeSheets);
  $$("#booha-game .sheet-wrap").forEach((wrap) => wrap.addEventListener("click", (event) => { if (event.target === wrap) closeSheets(); }));
  $("#g-paste-go").addEventListener("click", () => {
    try {
      const url = new URL($("#g-paste-url").value.trim(), window.location.href);
      const id = url.searchParams.get("ghost");
      if (url.searchParams.get("event") !== config.id || !(ghostById(id) || jokerById(id))) throw new Error("invalid");
      $("#g-paste-url").value = "";
      scanGhost(id);
    } catch (error) {
      $("#g-paste-err").textContent = "このURLはつかえません / That link isn't a ghost QR code.";
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !game.hidden) requestWakeLock();
    if (document.visibilityState === "hidden" && !$("#g-scanner").hidden) closeScanner();
  });
  $$("[data-ghost-total]").forEach((element) => { element.textContent = GHOST_TOTAL; });
  window.setInterval(updateStatus, 1000);
  updateStatus();
  const hashTab = window.location.hash.slice(1);
  const initialTab = ghostParam ? "candy" : ["info", "candy", "afternoon", "zombie"].includes(hashTab) ? hashTab : "info";
  selectTab(initialTab, false);
  window.addEventListener("hashchange", () => {
    const nextTab = window.location.hash.slice(1);
    if (["info", "candy", "afternoon", "zombie"].includes(nextTab)) selectTab(nextTab, false);
  });
  bootFromScan();
})();
