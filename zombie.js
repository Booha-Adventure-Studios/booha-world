/* Zombie Scavenger Hunt: full-screen night game.
   Teams find Ghost 1 to 15 in order. No QR codes: after "Found it!" the team picks the
   symbol they saw on the poster. A wrong pick waits 20 seconds. Each correct find reveals
   one kana of the secret phrase, which the team says at the Hospital Desk to finish.
   All data stays on this phone (localStorage). */
(() => {
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("event") || "halloween-2026";
  const config = window.BOOHA_EVENTS?.[eventId] || window.BOOHA_EVENTS?.["halloween-2026"];
  if (!config || !config.zombie || !document.getElementById("zombie-game")) return;

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const game = $("#zombie-game");
  const STORAGE_KEY = `booha:zombie-hunt:v1:${config.id}`;
  const TOTAL = config.zombie.ghosts.length;
  const PHRASE = config.zombie.phrase;
  const SYMBOLS = config.zombieSymbols;
  const TEST_TEAM = "ゾンビテスト";
  const LOCK_MS = 20000;
  const startsAt = new Date(config.zombieStartAt).getTime();
  const latestStartAt = new Date(config.zombieLatestStartAt || config.zombieStartAt).getTime() || startsAt + 3600e3;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const normalize = (value) => String(value || "").trim().toUpperCase();
  const isTestCode = (value) => normalize(value) === normalize(config.zombieTestCode || "ZOMBIE-TEST");
  const formatTime = (ms) => new Intl.DateTimeFormat("en-US", { timeZone: config.timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(ms));
  const formatClock = (ms, seconds) => new Intl.DateTimeFormat("ja-JP", { timeZone: config.timeZone, hour: "2-digit", minute: "2-digit", second: seconds ? "2-digit" : undefined, hour12: false }).format(new Date(ms));
  const symbolSvg = (id) => `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${SYMBOLS[id].d}"/></svg>`;
  const escapeHTML = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- storage ---------- */
  let state = null;
  const readState = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!stored) return null;
      if (Date.now() >= stored.expiresAt) { localStorage.removeItem(STORAGE_KEY); return null; }
      return stored;
    } catch (error) { return null; }
  };
  const saveState = () => { if (!state) return; state.updatedAt = Date.now(); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) { /* best effort */ } };

  /* ---------- sound (quiet, eerie, Web Audio only) ---------- */
  let audioContext = null;
  let soundOn = true;
  let drone = null;
  let heartbeatTimer = 0;
  try { soundOn = localStorage.getItem("booha:zombie-sound") !== "off"; } catch (error) { /* default on */ }
  const audio = () => {
    if (!soundOn) return null;
    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      return audioContext;
    } catch (error) { return null; }
  };
  const tone = (frequency, offset, length, type = "sine", volume = .08, slideTo) => {
    const context = audio(); if (!context) return;
    const time = context.currentTime + offset;
    const oscillator = context.createOscillator(); const gain = context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, time);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, time + length);
    gain.gain.setValueAtTime(.0001, time); gain.gain.exponentialRampToValueAtTime(volume, time + .03); gain.gain.exponentialRampToValueAtTime(.0001, time + length);
    oscillator.connect(gain).connect(context.destination); oscillator.start(time); oscillator.stop(time + length + .05);
  };
  const startAmbience = () => {
    const context = audio(); if (!context || drone) return;
    const master = context.createGain(); master.gain.value = .0001;
    master.gain.exponentialRampToValueAtTime(.05, context.currentTime + 2);
    const filter = context.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 380;
    const lfo = context.createOscillator(); const lfoGain = context.createGain();
    lfo.frequency.value = .08; lfoGain.gain.value = 160; lfo.connect(lfoGain).connect(filter.frequency); lfo.start();
    const oscillators = [55, 55.7, 82.4].map((f, i) => { const o = context.createOscillator(); o.type = i === 2 ? "triangle" : "sawtooth"; o.frequency.value = f; o.connect(filter); o.start(); return o; });
    filter.connect(master).connect(context.destination);
    drone = { master, oscillators, lfo };
    const beat = () => { tone(58, 0, .18, "sine", .12, 40); tone(52, .22, .22, "sine", .09, 36); };
    beat(); heartbeatTimer = setInterval(beat, 1500);
  };
  const stopAmbience = () => {
    clearInterval(heartbeatTimer); heartbeatTimer = 0;
    if (!drone || !audioContext) { drone = null; return; }
    const { master, oscillators, lfo } = drone;
    try { master.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + .4); setTimeout(() => { oscillators.forEach((o) => o.stop()); lfo.stop(); }, 500); } catch (error) { /* ignore */ }
    drone = null;
  };
  const SFX = {
    tap: () => tone(220, 0, .12, "triangle", .05),
    found: () => { [220, 261.6, 329.6, 392, 493.9].forEach((f, i) => { tone(f, i * .14, 1.2, "sine", .06); tone(f * 2.01, i * .14 + .02, .9, "sine", .02); }); },
    wrong: () => { tone(150, 0, .9, "sawtooth", .05, 70); tone(110, .1, .8, "triangle", .05, 55); },
    win: () => { [196, 233, 293.7, 349.2, 392, 466.2, 587.3].forEach((f, i) => tone(f, i * .16, 1.6, "triangle", .06)); }
  };
  const buzz = (pattern) => { try { if (navigator.vibrate && navigator.userActivation?.hasBeenActive !== false) navigator.vibrate(pattern); } catch (error) { /* optional */ } };
  let wakeLock = null;
  const requestWakeLock = async () => { try { if (navigator.wakeLock && !wakeLock) { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.addEventListener("release", () => { wakeLock = null; }); } } catch (error) { /* optional */ } };

  /* ---------- eerie background: dim breathing slime, flickers, drifting ghosts ---------- */
  const bg = $("#z-bg");
  const bgContext = bg.getContext("2d");
  let bgFrame = 0;
  const blobs = [
    { c: [70, 170, 50], x: .3, y: .3, r: .55, sx: .00007, sy: .00005, p: 0 },
    { c: [110, 50, 170], x: .7, y: .6, r: .6, sx: -.00005, sy: .00006, p: 2 },
    { c: [30, 150, 130], x: .5, y: .85, r: .5, sx: .00006, sy: -.00004, p: 4 },
    { c: [150, 190, 40], x: .2, y: .8, r: .4, sx: .00004, sy: .00007, p: 1 }
  ];
  const wisps = Array.from({ length: 5 }, (_, i) => ({ x: Math.random(), y: Math.random(), s: .3 + Math.random() * .5, size: 40 + Math.random() * 60, p: i }));
  let flickerUntil = 0;
  let nextFlicker = performance.now() + 4000;
  let tint = null;                                   // short color wash on found/wrong
  const drawWisp = (x, y, size, alpha) => {
    bgContext.save(); bgContext.translate(x, y); bgContext.globalAlpha = alpha; bgContext.fillStyle = "rgb(170, 255, 150)";
    bgContext.beginPath(); bgContext.arc(0, 0, size / 2, Math.PI, 0); bgContext.lineTo(size / 2, size * .55);
    for (let i = 4; i >= 0; i -= 1) bgContext.quadraticCurveTo(-size / 2 + size * (i + .5) / 4, size * .75, -size / 2 + size * i / 4, size * .55);
    bgContext.closePath(); bgContext.fill();
    bgContext.fillStyle = "rgb(5, 8, 6)"; bgContext.beginPath(); bgContext.ellipse(-size * .16, -size * .05, size * .07, size * .1, 0, 0, 7); bgContext.ellipse(size * .16, -size * .05, size * .07, size * .1, 0, 0, 7); bgContext.fill();
    bgContext.restore();
  };
  const drawBg = (time) => {
    bgFrame = 0;
    if (game.hidden) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = bg.clientWidth, h = bg.clientHeight;
    if (bg.width !== Math.round(w * dpr)) { bg.width = Math.round(w * dpr); bg.height = Math.round(h * dpr); }
    bgContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    bgContext.globalCompositeOperation = "source-over"; bgContext.globalAlpha = 1;
    bgContext.fillStyle = "#040705"; bgContext.fillRect(0, 0, w, h);
    if (time > nextFlicker) { flickerUntil = time + 60 + Math.random() * 140; nextFlicker = time + 3000 + Math.random() * 7000; }
    const flicker = time < flickerUntil ? .25 : 1;
    const heartbeat = .82 + .18 * Math.pow(Math.max(0, Math.sin(time / 1500 * Math.PI * 2)), 6);
    bgContext.globalCompositeOperation = "lighter";
    blobs.forEach((b) => {
      const x = (b.x + Math.sin(time * b.sx + b.p) * .2) * w;
      const y = (b.y + Math.cos(time * b.sy + b.p) * .2) * h;
      const radius = b.r * Math.max(w, h);
      const breathe = .55 + .45 * Math.sin(time / 2400 + b.p);
      const alpha = .22 * breathe * heartbeat * flicker;   // capped so the screen stays dark
      const gradient = bgContext.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(${b.c[0]}, ${b.c[1]}, ${b.c[2]}, ${alpha})`);
      gradient.addColorStop(1, `rgba(${b.c[0]}, ${b.c[1]}, ${b.c[2]}, 0)`);
      bgContext.fillStyle = gradient; bgContext.fillRect(0, 0, w, h);
    });
    if (tint && time < tint.until) {
      const k = (tint.until - time) / tint.length;
      bgContext.fillStyle = `rgba(${tint.c}, ${.18 * k})`; bgContext.fillRect(0, 0, w, h);
    }
    bgContext.globalCompositeOperation = "source-over";
    if (!reducedMotion) {
      wisps.forEach((wisp) => {
        wisp.y -= wisp.s / 4000; if (wisp.y < -.15) { wisp.y = 1.15; wisp.x = Math.random(); }
        drawWisp(wisp.x * w + Math.sin(time / 1800 + wisp.p) * 30, wisp.y * h, wisp.size, .05 * flicker * (.6 + .4 * Math.sin(time / 900 + wisp.p)));
      });
    }
    if (!reducedMotion || !drawBg.once) { drawBg.once = true; bgFrame = requestAnimationFrame(drawBg); }
  };
  const runBg = () => { if (!bgFrame) bgFrame = requestAnimationFrame(drawBg); };
  const washColor = (rgb, length = 1600) => { tint = { c: rgb, until: performance.now() + length, length }; };

  /* ---------- screens ---------- */
  const SCREENS = ["z-rules", "z-hunt", "z-pick", "z-complete"];
  const OVERLAYS = ["z-found", "z-wrong", "z-siren"];
  const showScreen = (id) => SCREENS.forEach((screen) => { $("#" + screen).hidden = screen !== id; });
  const showOverlay = (id) => OVERLAYS.forEach((overlay) => { $("#" + overlay).hidden = overlay !== id; });
  const applyTestOnly = () => $$("#zombie-game [data-test-only]").forEach((element) => { element.hidden = !state?.testMode; });
  const currentNumber = () => Math.min(state.found + 1, TOTAL);

  const renderTiles = (container, revealed, highlight) => {
    container.innerHTML = PHRASE.map((kana, i) => `<span class="z-tile${i < revealed ? " is-on" : ""}${i === highlight ? " is-new" : ""}">${i < revealed ? kana : "?"}</span>`).join("");
  };
  const renderHunt = () => {
    applyTestOnly();
    const n = currentNumber();
    $("#z-team").textContent = state.team;
    $("#z-count").textContent = state.found;
    $("#z-number").textContent = n;
    $("#z-find").innerHTML = `${n}ばんのゴーストをさがせ…<span class="en">Find Ghost ${n}…</span>`;
    renderTiles($("#z-tiles"), state.found, -1);
  };
  const renderSoundButton = () => {
    const button = $("#z-sound");
    button.innerHTML = soundOn
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
    button.setAttribute("aria-pressed", String(soundOn));
  };

  const openGame = () => {
    document.body.classList.add("game-open");
    game.hidden = false;
    renderSoundButton();
    requestWakeLock();
    runBg();
  };
  const closeGame = () => {
    game.hidden = true;
    document.body.classList.remove("game-open");
    showOverlay(null);
    stopAmbience();
    clearInterval(lockTimer); clearInterval(completeTimer);
    try { wakeLock?.release(); } catch (error) { /* ignore */ }
    const tab = $('.tab[data-tab="zombie"]'); if (tab) tab.click();
    const section = $("#zombie-start-section"); if (section) section.scrollIntoView({ block: "center" });
    renderPanel();
  };

  /* ---------- found it: pick the symbol ---------- */
  let lockTimer = 0;
  const showLock = () => {
    showOverlay("z-wrong");
    const tick = () => {
      const left = Math.max(0, Math.ceil((state.lockUntil - Date.now()) / 1000));
      $("#z-wrong-count").textContent = left;
      if (left <= 0) { clearInterval(lockTimer); showOverlay(null); showScreen("z-hunt"); }
    };
    clearInterval(lockTimer); tick(); lockTimer = setInterval(tick, 250);
  };
  const openPick = () => {
    if (state.lockUntil && Date.now() < state.lockUntil) { showLock(); return; }
    const n = currentNumber();
    const correct = config.zombie.ghosts[n - 1];
    const others = Object.keys(SYMBOLS).filter((id) => id !== correct).sort(() => Math.random() - .5).slice(0, 3);
    const choices = [correct, ...others].sort(() => Math.random() - .5);
    $("#z-pick-title").innerHTML = `${n}ばんのゴーストの<br>マークはどれ？<span class="en">Which mark is on Ghost ${n}?</span>`;
    const grid = $("#z-choices"); grid.innerHTML = "";
    choices.forEach((id) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `z-choice${state.testMode && id === correct ? " is-answer" : ""}`;
      button.innerHTML = `${symbolSvg(id)}<span>${SYMBOLS[id].jp}</span>`;
      button.setAttribute("aria-label", `${SYMBOLS[id].jp} / ${SYMBOLS[id].en}`);
      button.addEventListener("click", () => choose(id === correct));
      grid.appendChild(button);
    });
    showScreen("z-pick");
  };
  const choose = (isCorrect) => {
    if (!isCorrect) {
      state.lockUntil = Date.now() + LOCK_MS; saveState();
      SFX.wrong(); buzz([60, 80, 60]); washColor("170, 40, 60", 1200);
      showScreen("z-hunt"); showLock();
      return;
    }
    state.found += 1;
    state.lockUntil = 0;
    if (state.found >= TOTAL) state.completedAt = Date.now();
    saveState();
    SFX.found(); buzz([30, 60, 120]); washColor("120, 255, 120", 1800);
    const n = state.found;
    $("#z-found-title").innerHTML = `${n}ばん みつけた！<span class="en">Ghost ${n} found!</span>`;
    $("#z-found-kana").textContent = PHRASE[n - 1];
    renderTiles($("#z-found-tiles"), n, n - 1);
    showScreen("z-hunt"); renderHunt();
    showOverlay("z-found");
  };
  const closeFound = () => {
    showOverlay(null);
    if (state.completedAt) showComplete(true);
    else { renderHunt(); showScreen("z-hunt"); }
  };

  /* ---------- complete ---------- */
  let completeTimer = 0;
  const showComplete = (celebrate) => {
    applyTestOnly();
    $("#z-phrase").innerHTML = PHRASE.map((kana) => `<span>${kana}</span>`).join("");
    $("#z-proof-team").textContent = state.team;
    $("#z-proof-start").textContent = formatClock(state.startedAt);
    $("#z-proof-end").textContent = formatClock(state.completedAt);
    const tick = () => { $("#z-proof-now").textContent = formatClock(Date.now(), true); };
    tick(); clearInterval(completeTimer); completeTimer = setInterval(tick, 1000);
    showOverlay(null); showScreen("z-complete");
    if (celebrate) { SFX.win(); buzz([80, 60, 80, 60, 240]); washColor("150, 255, 120", 3000); }
  };

  /* ---------- siren blackout ---------- */
  let lastSirenTap = 0;
  const openSiren = () => { showOverlay("z-siren"); stopAmbience(); buzz(40); };
  const sirenTap = () => {
    const now = Date.now();
    if (now - lastSirenTap < 600) { lastSirenTap = 0; showOverlay(null); if (soundOn) startAmbience(); return; }
    lastSirenTap = now;
  };

  /* ---------- Zombie tab: start and continue ---------- */
  const countdownText = (ms) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const days = Math.floor(total / 86400), hours = Math.floor((total % 86400) / 3600), minutes = Math.floor((total % 3600) / 60), seconds = total % 60;
    if (days > 0) return { jp: `${days}日${hours}時間`, en: `${days}d ${hours}h` };
    const clock = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    return { jp: clock, en: clock };
  };
  const renderStartButton = () => {
    const button = $("#zombie-start-btn"); if (!button) return;
    const now = Date.now();
    const test = isTestCode($("#zombie-team").value);
    const open = now >= startsAt && now < latestStartAt;
    let jp, en;
    if (test) { jp = "テストをはじめる"; en = "Start test"; }
    else if (now < startsAt) { const left = countdownText(startsAt - now); jp = `あと <span class="start-time">${left.jp}</span> でスタート`; en = `Opens at ${formatTime(startsAt)} · <span class="start-time">${left.en}</span>`; }
    else if (open) { jp = "ゾンビの森へ！"; en = "Enter the forest"; }
    else { jp = "受付は終了しました"; en = "Check-in has closed"; }
    button.disabled = !test && !open;
    button.classList.toggle("is-ready", test || open);
    $("#zombie-start-jp").innerHTML = jp;
    $("#zombie-start-en").innerHTML = en;
  };
  const renderPanel = () => {
    const saved = readState();
    $("#zombie-start").hidden = Boolean(saved);
    $("#zombie-resume").hidden = !saved;
    if (saved) {
      const done = Boolean(saved.completedAt);
      $("#zombie-resume-label-jp").textContent = done ? "にげきった！" : "ハントのとちゅうです";
      $("#zombie-resume-label-en").textContent = done ? "You escaped!" : "Your hunt is in progress";
      $("#zombie-resume-count").textContent = `${saved.found} / ${TOTAL}`;
      $("#zombie-resume-team").textContent = saved.team;
      $("#zombie-resume-jp").textContent = done ? "ゴール画面を見る" : "つづける";
      $("#zombie-resume-en").textContent = done ? "Show the finish screen" : "Continue the hunt";
      $("#zombie-resume-reset").hidden = !saved.testMode;
    }
    renderStartButton();
  };
  const startHunt = () => {
    const input = $("#zombie-team");
    const name = input.value.trim();
    if (!name) { input.focus(); input.setCustomValidity("チーム名を入れてください。 / Enter a team name."); input.reportValidity(); return; }
    input.setCustomValidity("");
    const test = isTestCode(name);
    const now = Date.now();
    if (!test && (now < startsAt || now >= latestStartAt)) return;
    audio();
    state = {
      schemaVersion: 1, eventId: config.id, team: test ? TEST_TEAM : name, testMode: test,
      found: 0, lockUntil: 0, startedAt: now, updatedAt: now,
      expiresAt: now + (config.zombieHuntDurationHours || 6) * 3600e3, completedAt: null
    };
    saveState(); renderPanel();
    openGame();
    $("#z-welcome").textContent = `ようこそ、${state.team}`;
    applyTestOnly(); showOverlay(null); showScreen("z-rules");
  };
  const resumeHunt = () => {
    state = readState(); if (!state) { renderPanel(); return; }
    audio(); openGame(); applyTestOnly(); showOverlay(null);
    if (state.completedAt) showComplete(false);
    else { renderHunt(); showScreen("z-hunt"); if (soundOn) startAmbience(); if (state.lockUntil && Date.now() < state.lockUntil) showLock(); }
  };
  const resetTest = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch (error) { /* ignore */ }
    state = null;
    if (!game.hidden) closeGame();
    $("#zombie-team").value = config.zombieTestCode || "ZOMBIE-TEST";
    renderPanel();
  };

  /* ---------- wiring ---------- */
  $("#zombie-start-btn").addEventListener("click", startHunt);
  $("#zombie-team").addEventListener("input", (event) => { event.target.setCustomValidity(""); renderStartButton(); });
  $("#zombie-team").addEventListener("keydown", (event) => { if (event.key === "Enter" && !$("#zombie-start-btn").disabled) startHunt(); });
  $("#zombie-resume-btn").addEventListener("click", resumeHunt);
  $("#zombie-resume-reset").addEventListener("click", resetTest);
  $("#z-go").addEventListener("click", () => { SFX.tap(); renderHunt(); showScreen("z-hunt"); if (soundOn) startAmbience(); requestWakeLock(); });
  $("#z-found-btn").addEventListener("click", () => { SFX.tap(); openPick(); });
  $("#z-pick-cancel").addEventListener("click", () => { showScreen("z-hunt"); });
  $("#z-found").addEventListener("click", closeFound);
  $("#z-siren-btn").addEventListener("click", openSiren);
  $("#z-siren").addEventListener("click", sirenTap);
  $("#z-back").addEventListener("click", closeGame);
  $("#z-complete-back").addEventListener("click", closeGame);
  $("#z-complete-reset").addEventListener("click", resetTest);
  $("#z-sound").addEventListener("click", () => {
    soundOn = !soundOn;
    try { localStorage.setItem("booha:zombie-sound", soundOn ? "on" : "off"); } catch (error) { /* optional */ }
    renderSoundButton();
    if (soundOn) startAmbience(); else stopAmbience();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !game.hidden) requestWakeLock();
    if (document.visibilityState === "hidden") stopAmbience();
    else if (!game.hidden && soundOn && !$("#z-hunt").hidden && $("#z-siren").hidden) startAmbience();
  });
  $$("[data-zombie-total]").forEach((element) => { element.textContent = TOTAL; });
  renderPanel();
  setInterval(renderStartButton, 1000);
})();
