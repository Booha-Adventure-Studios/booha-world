(() => {
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("event") || "halloween-2026";
  const config = window.BOOHA_EVENTS?.[eventId] || window.BOOHA_EVENTS?.["halloween-2026"];
  const ghostParam = params.get("ghost");
  const storageKey = `booha:event-hunt:v1:${config.id}`;

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const setBilingual = (selector, jp, en) => {
    const element = $(selector);
    if (!element) return;
    element.innerHTML = `<span class="jp-main">${jp}</span><span class="en-sub">${en}</span>`;
  };
  const startsAt = new Date(config.startAt).getTime();
  const latestStartAt = new Date(config.latestStartAt).getTime();
  const arrivalStartAt = new Date(config.arrivalStartAt).getTime();
  const stayUntil = new Date(config.stayUntil).getTime();

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

  const playReward = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const context = new AudioContext();
      const now = context.currentTime;
      [523.25, 659.25, 783.99].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, now + index * .08);
        gain.gain.exponentialRampToValueAtTime(.12, now + index * .08 + .02);
        gain.gain.exponentialRampToValueAtTime(.0001, now + index * .08 + .28);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(now + index * .08);
        oscillator.stop(now + index * .08 + .3);
      });
    } catch (error) { /* Sound is optional. */ }
  };

  const setFeedback = (message, kind = "") => {
    const feedback = $("#hunt-active").hidden ? $("#prestart-feedback") : $("#scan-feedback");
    feedback.textContent = message;
    feedback.className = `feedback ${kind}`.trim();
  };

  const renderTarget = (state) => {
    const complete = state.nextIndex >= config.ghosts.length;
    $("#hunt-start").hidden = true;
    $("#hunt-active").hidden = complete;
    $("#hunt-complete").hidden = !complete;
    $("#participant-label").textContent = state.participantLabel;
    $("#progress-count").textContent = `${state.nextIndex} / ${config.ghosts.length}`;

    if (complete) {
      $("#completion-copy").textContent = config.candyReward;
      $("#completion-name").textContent = state.participantLabel;
      $("#completion-time").textContent = `Completed ${formatDateTime(state.completedAt)}`;
      return;
    }

    const target = ghostById(state.order[state.nextIndex]);
    $("#target-label-jp").innerHTML = target.jp;
    $("#target-label-en").textContent = target.label;
    $("#target-swatch").style.background = target.color;
    $("#target-swatch").style.setProperty("--target-color", target.color);
    $("#target-instruction-jp").textContent = `森で${target.jp.replace(/<[^>]*>/g, "")}ゴーストを見つけて、QRコードをスキャンしてください。`;
    $("#target-instruction-en").textContent = `Find the ${target.label.toLowerCase()} ghost in the forest, then scan its QR code.`;
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

    if (now < arrivalStartAt) {
      $("#candy-status-label-jp").textContent = "来場開始";
      $("#candy-status-label-en").textContent = "Arrivals open at";
      countdown.textContent = formatTime(arrivalStartAt);
      $("#candy-status-copy-jp").textContent = `来場受付は${formatTime(arrivalStartAt)}からです。ハントは${formatTime(startsAt)}に始まります。`;
      $("#candy-status-copy-en").textContent = `The forest opens for arrivals at ${formatTime(arrivalStartAt)}. The hunt opens at ${formatTime(startsAt)}.`;
    } else if (now < startsAt) {
      $("#candy-status-label-jp").textContent = "キャンディの森 開始まで";
      $("#candy-status-label-en").textContent = "Candy Forest opens in";
      countdown.textContent = duration(remaining(startsAt));
      $("#candy-status-copy-jp").textContent = `受付中です。ハントは${formatTime(startsAt)}に始まります。`;
      $("#candy-status-copy-en").textContent = `Arrivals are open. The hunt opens at ${formatTime(startsAt)}.`;
    } else if (now < latestStartAt) {
      $("#candy-status-label-jp").textContent = "キャンディの森 開催中";
      $("#candy-status-label-en").textContent = "Candy Forest is open";
      countdown.textContent = duration(remaining(latestStartAt));
      $("#candy-status-copy-jp").textContent = `${formatTime(latestStartAt)}まで新しく始められます。始めたハントは、そのあとも続けられます。`;
      $("#candy-status-copy-en").textContent = `New families may start until ${formatTime(latestStartAt)}. Started hunts can continue after the cutoff.`;
    } else if (now < stayUntil) {
      $("#candy-status-label-jp").textContent = "新しい受付は終了";
      $("#candy-status-label-en").textContent = "New starts are closed";
      countdown.textContent = `Until ${formatTime(stayUntil)}`;
      $("#candy-status-copy-jp").textContent = "始めたハントは続けられます。お弁当やおやつを持って、森で過ごせます。";
      $("#candy-status-copy-en").textContent = "If your family already started, continue your hunt. Families may stay in the forest with lunches and snacks.";
    } else {
      $("#candy-status-label-jp").textContent = "昼の森イベント終了";
      $("#candy-status-label-en").textContent = "Daytime forest period finished";
      countdown.textContent = "—";
      $("#candy-status-copy-jp").textContent = "次のイベントやマシュマロエリアについては、スタッフの案内に従ってください。";
      $("#candy-status-copy-en").textContent = "Please follow staff instructions for the next event or the marshmallow area.";
    }

    startButton.disabled = !(now >= startsAt && now < latestStartAt);
    const state = readState();
    if (state) renderTarget(state);
  };

  const startHunt = () => {
    if (Date.now() < startsAt || Date.now() >= latestStartAt) return;
    const input = $("#participant-name");
    const name = input.value.trim();
    if (!name) {
      input.focus();
      input.setCustomValidity("Enter a family or team name.");
      input.reportValidity();
      return;
    }
    input.setCustomValidity("");
    const now = Date.now();
    const state = {
      schemaVersion: 1,
      eventId: config.id,
      participantLabel: name,
      order: shuffle(config.ghosts.map((ghost) => ghost.id)),
      found: [],
      nextIndex: 0,
      startedAt: now,
      updatedAt: now,
      expiresAt: now + config.huntDurationHours * 60 * 60 * 1000,
      completedAt: null
    };
    saveState(state);
    renderTarget(state);
    setFeedback("順番が決まりました。最初のゴーストをさがしてください。 / Your order is ready. Find your first ghost.", "is-muted");
  };

  const processGhostScan = () => {
    if (!ghostParam) return;
    const state = readState();
    if (!state) {
      $("#panel-candy").hidden = false;
      $("#hunt-start").hidden = false;
      setFeedback("先に家族のハントを始めてから、もう一度スキャンしてください。 / Start your family hunt first, then scan the ghost again.", "is-muted");
      return;
    }
    if (state.nextIndex >= config.ghosts.length) return;
    const scanned = ghostById(ghostParam);
    if (!scanned) {
      setFeedback("ブーハーの信号が見つかりません。イベントのQRコードを確認してください。 / Check the event QR code.", "is-wrong");
      return;
    }
    if (state.found.includes(scanned.id)) {
      setFeedback(`${scanned.label}はもう見つけています。今のターゲットをさがしてください。 / Already found. Keep looking for your current target.`, "is-muted");
      return;
    }
    const targetId = state.order[state.nextIndex];
    if (scanned.id !== targetId) {
      setFeedback("まだです！今のターゲットをさがしてください。順番は失われません。 / Not yet! Keep looking for your current target.", "is-wrong");
      return;
    }
    state.found.push(scanned.id);
    state.nextIndex += 1;
    if (state.nextIndex >= config.ghosts.length) state.completedAt = Date.now();
    saveState(state);
    playReward();
    renderTarget(state);
    if (state.completedAt) setFeedback("10ひき全部見つけました！完了画面をブライアンに見せてください。 / All ten ghosts found! Show your completion screen to Bryan.");
    else setFeedback(`${scanned.label}を発見！つぎへ進みましょう。 / ${scanned.label} found! Keep going.`, "");
  };

  const selectTab = (tabName) => {
    $$(".tab").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === tabName));
    $$(".tab-panel").forEach((panel) => {
      const active = panel.dataset.panel === tabName;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
    document.body.dataset.theme = tabName;
    if (tabName === "candy") updateStatus();
  };

  setBilingual("#location-copy", config.sections.location.jp, config.sections.location.en);
  setBilingual("#bring-copy", config.sections.bring.jp, config.sections.bring.en);
  setBilingual("#safety-copy", config.sections.safety.jp, config.sections.safety.en);
  setBilingual("#schedule-copy", config.sections.schedule.jp, config.sections.schedule.en);
  $("#parking-address-jp").textContent = config.parking.addressJP;
  $("#parking-address-en").textContent = config.parking.addressEN;
  setBilingual("#parking-note", config.parking.noteJP, config.parking.noteEN);
  $("#parking-map-link").href = config.parking.mapUrl;
  $("#email-link").textContent = config.contacts.email;
  $("#email-link").href = `mailto:${config.contacts.email}`;
  $("#phone-link").textContent = config.contacts.phone;
  $("#phone-link").href = `tel:${config.contacts.phone.replace(/\D/g, "")}`;

  $$(".tab").forEach((tab) => tab.addEventListener("click", () => selectTab(tab.dataset.tab)));
  $$('[data-go-tab="candy"]').forEach((button) => button.addEventListener("click", () => { selectTab("candy"); window.scrollTo({ top: 0, behavior: "smooth" }); }));
  $("#start-hunt").addEventListener("click", startHunt);
  $("#participant-name").addEventListener("input", (event) => event.target.setCustomValidity(""));
  window.setInterval(updateStatus, 1000);
  updateStatus();
  selectTab(ghostParam ? "candy" : "info");
  processGhostScan();
})();
