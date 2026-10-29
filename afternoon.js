/* Afternoon team activities: Witch's Ingredient Hunt and Build a Forest Monster.
   Flow: password (announced by Bryan) -> choose your spot -> a teacher holds "OK" -> the list.
   Witch: each team gets its own random ingredients with exact counts; check each one off.
   Monster: every team builds with the whole parts menu (bonus parts optional); name it and finish.
   Everything stays on this phone (localStorage). */
(() => {
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("event") || "halloween-2026";
  const config = window.BOOHA_EVENTS?.[eventId] || window.BOOHA_EVENTS?.["halloween-2026"];
  const GAMES = config?.afternoonGames;
  const root = document.getElementById("act-game");
  if (!GAMES || !root) return;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const escapeHTML = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const keyFor = (game) => `booha:afternoon:v1:${config.id}:${game}`;
  const random = () => { try { const b = new Uint32Array(1); crypto.getRandomValues(b); return b[0] / 4294967296; } catch (e) { return Math.random(); } };
  const shuffle = (items) => { const r = [...items]; for (let i = r.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

  let gameId = null;
  let state = null;
  const game = () => GAMES[gameId];
  const load = (id) => { try { return JSON.parse(localStorage.getItem(keyFor(id)) || "null"); } catch (e) { return null; } };
  const save = () => { try { localStorage.setItem(keyFor(gameId), JSON.stringify(state)); } catch (e) { /* best effort */ } };
  const buzz = (p) => { try { if (navigator.vibrate && navigator.userActivation?.hasBeenActive !== false) navigator.vibrate(p); } catch (e) { /* optional */ } };

  // Each team's own random list. Rare items (gourds) appear for about 1 team in 3.
  const makeList = () => {
    const g = game();
    if (gameId === "monster") return g.items.map((item) => item.id);
    const pool = g.items.filter((item) => !item.rare || random() < 1 / 3);
    const n = g.pickMin + Math.floor(random() * (g.pickMax - g.pickMin + 1));
    const picked = shuffle(pool).slice(0, Math.min(n, pool.length)).map((item) => item.id);
    return g.items.map((item) => item.id).filter((id) => picked.includes(id));   // keep a stable, readable order
  };
  const itemById = (id) => game().items.find((item) => item.id === id) || (game().bonus || []).find((item) => item.id === id);
  const required = () => gameId === "monster" ? game().items.map((item) => item.id) : state.list;
  const requiredDone = () => required().filter((id) => state.checked.includes(id)).length;

  /* ---------- razzle-dazzle: sparkles, floating words, chimes ---------- */
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const WORDS = {
    witch: [["ブクブク！", "Bubble!"], ["キラリ！", "Sparkle!"], ["ぽわん！", "Poof!"], ["まぜまぜ！", "Stir!"], ["ドロン！", "Zap!"], ["いいかんじ！", "Nice!"]],
    monster: [["ガオー！", "Roar!"], ["ニョキッ！", "Sprout!"], ["モリッ！", "Mighty!"], ["いいね！", "Nice!"], ["ズシン！", "Stomp!"], ["できた！", "Got it!"]]
  };
  const COLORS = {
    witch: ["#7cdf64", "#b07cff", "#ffd23f", "#ff5fa2", "#ffffff"],
    monster: ["#6aa84f", "#f2c94c", "#e07a2a", "#8a5a2b", "#b5e36b"]
  };
  let fx = null;
  const fxCanvas = () => {
    if (!fx) {
      const canvas = document.createElement("canvas");
      canvas.id = "act-fx"; canvas.setAttribute("aria-hidden", "true");
      document.body.appendChild(canvas);
      fx = { canvas, context: canvas.getContext("2d"), parts: [], frame: 0 };
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth, h = window.innerHeight;
    if (fx.canvas.width !== Math.round(w * dpr)) { fx.canvas.width = Math.round(w * dpr); fx.canvas.height = Math.round(h * dpr); }
    fx.dpr = dpr; fx.w = w; fx.h = h;
    return fx;
  };
  const drawPart = (c, p) => {
    c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6));
    c.fillStyle = p.color; c.strokeStyle = "#251034"; c.lineWidth = 1.6;
    if (p.shape === "star") {
      c.beginPath(); for (let i = 0; i < 10; i += 1) { const r = i % 2 ? p.size * .42 : p.size; const a = i * Math.PI / 5 - Math.PI / 2; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.stroke();
    } else if (p.shape === "bubble") {
      c.beginPath(); c.arc(0, 0, p.size * .7, 0, 7); c.fill(); c.stroke();
      c.fillStyle = "rgba(255,255,255,.8)"; c.beginPath(); c.arc(-p.size * .25, -p.size * .25, p.size * .18, 0, 7); c.fill();
    } else if (p.shape === "leaf") {
      c.beginPath(); c.ellipse(0, 0, p.size, p.size * .45, 0, 0, 7); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-p.size, 0); c.lineTo(p.size, 0); c.stroke();
    } else {
      c.fillStyle = "#8a5a2b"; c.beginPath(); c.ellipse(0, p.size * .15, p.size * .55, p.size * .7, 0, 0, 7); c.fill(); c.stroke();
      c.fillStyle = "#5a3a1b"; c.beginPath(); c.ellipse(0, -p.size * .45, p.size * .7, p.size * .3, 0, 0, 7); c.fill(); c.stroke();
    }
    c.restore();
  };
  const tick = () => {
    const f = fx; f.frame = 0;
    const c = f.context; c.setTransform(f.dpr, 0, 0, f.dpr, 0, 0); c.clearRect(0, 0, f.w, f.h);
    f.parts = f.parts.filter((p) => p.life > 0 && p.y < f.h + 60);
    f.parts.forEach((p) => { p.vx *= .98; p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= p.decay; drawPart(c, p); });
    if (f.parts.length) f.frame = requestAnimationFrame(tick);
  };
  const burst = (x, y, count = 22, power = 7) => {
    if (reducedMotion) count = Math.min(count, 6);
    const f = fxCanvas();
    const shapes = gameId === "witch" ? ["bubble", "star", "bubble", "star"] : ["leaf", "acorn", "leaf", "star"];
    const colors = COLORS[gameId];
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2; const sp = power * (.4 + Math.random());
      f.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3.5, g: .22, rot: Math.random() * 6, vr: (Math.random() - .5) * .3,
        size: 5 + Math.random() * 6, life: 1, decay: .012 + Math.random() * .012, color: colors[i % colors.length], shape: shapes[i % shapes.length] });
    }
    if (!f.frame) f.frame = requestAnimationFrame(tick);
  };
  const floatWord = (x, y) => {
    const [jp, en] = WORDS[gameId][Math.floor(Math.random() * WORDS[gameId].length)];
    const el = document.createElement("div");
    el.className = `act-float act-float-${gameId}`;
    el.innerHTML = `${jp}<span>${en}</span>`;
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  };
  const banner = (jp, en) => {
    const el = document.createElement("div");
    el.className = `act-banner act-banner-${gameId}`;
    el.innerHTML = `${jp}<span>${en}</span>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1900);
  };
  let audioContext = null;
  const chime = (step) => {
    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      const scale = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093, 2349];
      const f = scale[Math.min(step, scale.length - 1)];
      const t = audioContext.currentTime;
      [[f, 0], [f * 1.5, .07]].forEach(([freq, offset]) => {
        const o = audioContext.createOscillator(); const g = audioContext.createGain();
        o.type = gameId === "witch" ? "triangle" : "square"; o.frequency.setValueAtTime(freq, t + offset);
        g.gain.setValueAtTime(.0001, t + offset); g.gain.exponentialRampToValueAtTime(gameId === "witch" ? .12 : .06, t + offset + .015); g.gain.exponentialRampToValueAtTime(.0001, t + offset + .3);
        o.connect(g).connect(audioContext.destination); o.start(t + offset); o.stop(t + offset + .35);
      });
    } catch (e) { /* sound is optional */ }
  };
  const fanfare = () => { [0, 4, 7, 12, 16].forEach((semi, i) => setTimeout(() => chime(Math.min(11, 3 + i * 2)), i * 110)); };
  const countText = (item) => item.countJP ? `${item.countJP}<span class="en">${item.countEN}</span>` : `×${item.count}`;

  /* ---------- screens ---------- */
  const shell = (inner) => {
    const g = game();
    root.innerHTML = `
      <div class="act-bg" aria-hidden="true"></div>
      <div class="act-top">
        <button class="act-icon" type="button" data-act="close" aria-label="もどる / Back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
        <div class="act-title">${g.titleJP}<span class="en">${g.titleEN}</span></div>
      </div>
      <div class="act-body">${inner}</div>`;
  };
  const art = () => gameId === "witch"
    ? `<svg class="act-art" viewBox="0 0 200 150" aria-hidden="true">
         <circle class="bub b1" cx="80" cy="42" r="9"/><circle class="bub b2" cx="112" cy="30" r="12"/><circle class="bub b3" cx="128" cy="50" r="7"/>
         <ellipse cx="100" cy="70" rx="72" ry="16" fill="#7cdf64" stroke="#251034" stroke-width="6"/>
         <path d="M30 72 C30 135 170 135 170 72" fill="#2b1440" stroke="#251034" stroke-width="6"/>
         <path d="M48 128 l-10 16 M152 128 l10 16" stroke="#251034" stroke-width="7" stroke-linecap="round"/>
       </svg>`
    : `<svg class="act-art" viewBox="0 0 200 150" aria-hidden="true">
         <path d="M40 120 C30 60 70 20 100 20 C130 20 170 60 160 120 Z" fill="#6aa84f" stroke="#251034" stroke-width="6"/>
         <path d="M60 30 l-14 -22 M140 30 l14 -22 M100 20 l0 -18" stroke="#8a5a2b" stroke-width="7" stroke-linecap="round"/>
         <circle cx="78" cy="68" r="15" fill="#fff" stroke="#251034" stroke-width="5"/><circle cx="122" cy="68" r="15" fill="#fff" stroke="#251034" stroke-width="5"/>
         <circle class="pupil" cx="80" cy="70" r="6" fill="#251034"/><circle class="pupil" cx="124" cy="70" r="6" fill="#251034"/>
         <path d="M76 98 Q100 116 124 98" fill="none" stroke="#251034" stroke-width="6" stroke-linecap="round"/>
         <path d="M88 103 l4 9 l4 -7 l4 7 l4 -7 l4 9" fill="#fff" stroke="#251034" stroke-width="3" stroke-linejoin="round"/>
       </svg>`;

  const showPassword = (wrong) => {
    shell(`
      ${art()}
      <form class="act-card" data-act="password-form" novalidate>
        <label for="act-password">あいことばは？<span class="en">What's the password?</span></label>
        <input id="act-password" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="あいことば / password">
        <p class="act-err" role="alert">${wrong ? "ちがうよ！もう<ruby>一度<rt>いちど</rt></ruby>きいてね。<span class=\"en\">Not quite. Listen for the password and try again.</span>" : ""}</p>
        <button class="act-btn" type="submit">ひらく<span class="en">Open</span></button>
      </form>`);
    if (wrong) $(".act-card", root).classList.add("shake");
    setTimeout(() => $("#act-password")?.focus(), 50);
  };

  const showSpot = () => {
    shell(`
      ${art()}
      <div class="act-card">
        <p class="act-step">ステップ 1<span class="en">Step 1</span></p>
        <h2>チームのばしょを きめよう！<span class="en">Choose your team's spot!</span></h2>
        <p>${gameId === "witch" ? "あつめた<ruby>材料<rt>ざいりょう</rt></ruby>を ここに もってきます。" : "ここに モンスターを つくります。"}<span class="en">${gameId === "witch" ? "You will bring your ingredients back here." : "You will build your monster here."}</span></p>
        <label for="act-team">チームのなまえ（なくてもOK）<span class="en">Team name (optional)</span></label>
        <input id="act-team" type="text" maxlength="24" autocomplete="off" value="${escapeHTML(state.team || "")}">
        <button class="act-btn" type="button" data-act="spot-done">ばしょが きまった！<span class="en">We picked our spot!</span></button>
      </div>`);
  };

  let holdTimer = 0;
  const showTeacher = () => {
    shell(`
      ${art()}
      <div class="act-card">
        <p class="act-step">ステップ 2<span class="en">Step 2</span></p>
        <h2><ruby>先生<rt>せんせい</rt></ruby>に ばしょを みせてね<span class="en">Show your spot to a teacher</span></h2>
        <p><ruby>先生<rt>せんせい</rt></ruby>が OKなら、<ruby>先生<rt>せんせい</rt></ruby>が ボタンを ながおしします。<span class="en">If it's OK, the teacher presses and holds the button.</span></p>
        <button class="act-btn act-hold" type="button" data-act="hold"><span class="hold-fill" aria-hidden="true"></span><span class="hold-label"><span><ruby>先生<rt>せんせい</rt></ruby>OK（ながおし）</span><span class="en">Teacher OK (press and hold)</span></span></button>
        <button class="act-link" type="button" data-act="back-spot">ばしょを かえる<span class="en">Change spot</span></button>
      </div>`);
    const hold = $(".act-hold", root);
    const start = (event) => {
      event.preventDefault();
      hold.classList.add("is-holding");
      clearTimeout(holdTimer);
      holdTimer = setTimeout(() => { buzz([30, 40, 80]); state.step = "list"; save(); render(); }, 1200);
    };
    const stop = () => { hold.classList.remove("is-holding"); clearTimeout(holdTimer); };
    hold.addEventListener("pointerdown", start);
    ["pointerup", "pointerleave", "pointercancel"].forEach((type) => hold.addEventListener(type, stop));
    hold.addEventListener("contextmenu", (event) => event.preventDefault());
  };

  const teamLine = () => state.team ? `<p class="act-team">${escapeHTML(state.team)}</p>` : "";

  const showWitchList = () => {
    const total = state.list.length;
    const done = requiredDone();
    shell(`
      <div class="act-card act-list-card">
        ${teamLine()}
        <p class="act-step">ステップ 3<span class="en">Step 3</span></p>
        <h2><ruby>材料<rt>ざいりょう</rt></ruby>を あつめて、<wbr>ばしょに もってこよう！<span class="en">Collect the ingredients and bring them to your spot!</span></h2>
        <div class="act-progress"><span style="width:${Math.round(done / total * 100)}%"></span></div>
        <p class="act-count">${done} / ${total}</p>
        <ul class="act-list">
          ${state.list.map((id) => { const it = itemById(id); const on = state.checked.includes(id); return `
            <li><button type="button" class="act-item${on ? " is-on" : ""}" data-act="toggle" data-id="${id}" aria-pressed="${on}">
              <span class="tick" aria-hidden="true"></span>
              <span class="names"><b>${it.jp}</b><span class="en">${it.en}</span><span class="real">= ${it.realJP}<span class="en">${it.realEN}</span></span></span>
              <span class="qty">${countText(it)}</span>
            </button></li>`; }).join("")}
        </ul>
        <button class="act-link" type="button" data-act="reset">やりなおす<span class="en">Start over</span></button>
      </div>`);
  };

  const itemButton = (it) => {
    const on = state.checked.includes(it.id);
    return `<li><button type="button" class="act-item${on ? " is-on" : ""}" data-act="toggle" data-id="${it.id}" aria-pressed="${on}">
      <span class="tick" aria-hidden="true"></span>
      <span class="names"><b>${it.jp}</b><span class="en">${it.en}</span></span>
    </button></li>`;
  };
  const showMonsterList = () => {
    const total = required().length;
    const done = requiredDone();
    shell(`
      ${art()}
      <div class="act-card act-list-card">
        ${teamLine()}
        <p class="act-step">ステップ 3<span class="en">Step 3</span></p>
        <h2>じめんに モンスターを つくろう！<span class="en">Build your monster on the ground!</span></h2>
        <p>もりの ものなら なんでも つかってOK。<wbr>この パーツを ぜんぶ つけてね！<span class="en">Use anything from the forest. Your monster needs every part on this list!</span></p>
        <div class="act-progress"><span style="width:${Math.round(done / total * 100)}%"></span></div>
        <p class="act-count">${done} / ${total}</p>
        <ul class="act-list">${game().items.map(itemButton).join("")}</ul>
        <p class="act-bonus-title">ボーナス（なくても OK）<span class="en">Bonus parts (optional)</span></p>
        <ul class="act-list act-bonus">${(game().bonus || []).map(itemButton).join("")}</ul>
        <label for="act-monster-name">モンスターの なまえ<span class="en">Your monster's name</span></label>
        <input id="act-monster-name" type="text" maxlength="24" autocomplete="off" value="${escapeHTML(state.monsterName || "")}" placeholder="れい：モリモリン">
        <button class="act-btn" type="button" data-act="monster-done" ${done >= total ? "" : "disabled"}>かんせい！<span class="en">Finished!</span></button>
        <button class="act-link" type="button" data-act="reset">やりなおす<span class="en">Start over</span></button>
      </div>`);
  };

  const showDone = () => {
    const witch = gameId === "witch";
    shell(`
      ${art()}
      <div class="act-card act-done">
        ${teamLine()}
        <h2 class="act-big">${witch ? "まほうのくすり、<wbr>かんせい！" : `${escapeHTML(state.monsterName || "モンスター")}、<wbr>かんせい！`}<span class="en">${witch ? "The magic potion is ready!" : `${escapeHTML(state.monsterName || "Your monster")} is alive!`}</span></h2>
        <p>${witch ? "あつめた<ruby>材料<rt>ざいりょう</rt></ruby>を <ruby>先生<rt>せんせい</rt></ruby>に みせてね！" : "モンスターと いっしょに しゃしんを とろう！ <ruby>先生<rt>せんせい</rt></ruby>にも みせてね。"}<span class="en">${witch ? "Show your ingredients to a teacher!" : "Take a photo with your monster, and show a teacher!"}</span></p>
        <button class="act-link" type="button" data-act="back-list">リストを みる<span class="en">See the list</span></button>
        <button class="act-link" type="button" data-act="reset">やりなおす<span class="en">Start over</span></button>
      </div>`);
    root.classList.add("celebrate");
    setTimeout(() => root.classList.remove("celebrate"), 2400);
  };

  const render = () => {
    if (!state?.unlocked) return showPassword(false);
    if (state.step === "spot") return showSpot();
    if (state.step === "teacher") return showTeacher();
    if (state.step === "done") return showDone();
    return gameId === "witch" ? showWitchList() : showMonsterList();
  };

  /* ---------- open / close ---------- */
  const open = (id) => {
    gameId = id;
    state = load(id) || { unlocked: false, step: "spot", team: "", list: [], checked: [], monsterName: "" };
    root.className = `act-game act-${id}`;
    root.hidden = false;
    document.body.classList.add("game-open");
    render();
  };
  const close = () => {
    clearTimeout(holdTimer);
    root.hidden = true;
    root.innerHTML = "";
    document.body.classList.remove("game-open");
    const section = document.getElementById("afternoon-games"); if (section) section.scrollIntoView({ block: "center" });
  };

  let finishing = false;
  const toggleItem = (button) => {
    if (finishing) return;
    const id = button.dataset.id;
    const on = !state.checked.includes(id);
    const before = requiredDone();
    state.checked = on ? [...state.checked, id] : state.checked.filter((x) => x !== id);
    save();
    button.classList.toggle("is-on", on);
    button.setAttribute("aria-pressed", String(on));
    const total = required().length;
    const done = requiredDone();
    const bar = $(".act-progress span", root); if (bar) bar.style.width = `${Math.round(done / total * 100)}%`;
    const count = $(".act-count", root); if (count) count.textContent = `${done} / ${total}`;
    const finish = $('[data-act="monster-done"]', root); if (finish) finish.disabled = done < total;
    if (!on) return;
    button.classList.remove("pop"); void button.offsetWidth; button.classList.add("pop");
    const box = $(".tick", button).getBoundingClientRect();
    const x = box.left + box.width / 2, y = box.top + box.height / 2;
    burst(x, y); floatWord(x + 40, y - 10); chime(Math.round(done / total * 11)); buzz(18);
    if (before < total / 2 && done >= total / 2 && done < total) banner("あと はんぶん！", "Halfway there!");
    if (done === total) {
      if (gameId === "witch") {
        finishing = true;
        setTimeout(() => { burst(window.innerWidth / 2, window.innerHeight * .45, 90, 13); fanfare(); buzz([40, 40, 120]); }, 250);
        setTimeout(() => { finishing = false; state.step = "done"; save(); render(); }, 1100);
      } else {
        banner("ぜんぶ そろった！", "Every part is there!");
        if (finish) { finish.classList.remove("ready"); void finish.offsetWidth; finish.classList.add("ready"); }
      }
    }
  };

  let resetArmed = 0;
  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-act]");
    if (!button || button.tagName === "FORM") return;
    const act = button.dataset.act;
    if (act === "close") return close();
    if (act === "spot-done") { state.team = $("#act-team").value.trim(); state.step = "teacher"; save(); return render(); }
    if (act === "back-spot") { state.step = "spot"; save(); return render(); }
    if (act === "toggle") return toggleItem(button);
    if (act === "monster-done") {
      state.monsterName = $("#act-monster-name").value.trim(); state.step = "done"; save();
      burst(window.innerWidth / 2, window.innerHeight * .45, 90, 13); fanfare(); buzz([40, 40, 120]);
      return render();
    }
    if (act === "back-list") { state.step = "list"; save(); return render(); }
    if (act === "reset") {
      // Two taps to confirm, so a stray tap can't wipe the list.
      if (Date.now() - resetArmed > 3000) { resetArmed = Date.now(); button.innerHTML = "もう<ruby>一度<rt>いちど</rt></ruby>おすと リセット<span class=\"en\">Tap again to start over</span>"; return; }
      resetArmed = 0;
      state = { unlocked: true, step: "spot", team: "", list: makeList(), checked: [], monsterName: "" };
      save(); return render();
    }
  });
  root.addEventListener("submit", (event) => {
    event.preventDefault();
    const typed = String($("#act-password").value || "").trim().toLowerCase();
    if (typed === String(game().password).toLowerCase()) {
      state.unlocked = true;
      if (!state.list.length) state.list = makeList();
      save(); buzz(30); render();
    } else { buzz([60, 40, 60]); showPassword(true); }
  });
  root.addEventListener("input", (event) => {
    if (event.target.id === "act-monster-name") { state.monsterName = event.target.value.trim(); save(); }
  });
  document.querySelectorAll("[data-open-activity]").forEach((button) => button.addEventListener("click", () => open(button.dataset.openActivity)));
})();
