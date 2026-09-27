(() => {
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("event") || "halloween-2026";
  const config = window.BOOHA_EVENTS?.[eventId] || window.BOOHA_EVENTS?.["halloween-2026"];
  const ghostParam = params.get("ghost");
  const storageKey = `booha:event-hunt:v1:${config.id}`;

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
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
    $("#target-label").textContent = target.label;
    $("#target-swatch").style.background = target.color;
    $("#target-swatch").style.setProperty("--target-color", target.color);
    $("#target-instruction").textContent = `Find the ${target.label.toLowerCase()} ghost in the forest, then scan its QR code.`;
  };

  const updateStatus = () => {
    const now = Date.now();
    const label = $("#candy-status-label");
    const countdown = $("#countdown");
    const copy = $("#candy-status-copy");
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
      label.textContent = "Arrivals open at";
      countdown.textContent = formatTime(arrivalStartAt);
      copy.textContent = `The forest opens for arrivals at ${formatTime(arrivalStartAt)}. The hunt opens at ${formatTime(startsAt)}.`;
    } else if (now < startsAt) {
      label.textContent = "Candy Forest opens in";
      countdown.textContent = duration(remaining(startsAt));
      copy.textContent = `Arrivals are open. The hunt opens at ${formatTime(startsAt)}.`;
    } else if (now < latestStartAt) {
      label.textContent = "Candy Forest is open";
      countdown.textContent = duration(remaining(latestStartAt));
      copy.textContent = `New families may start until ${formatTime(latestStartAt)}. Started hunts can continue after the cutoff.`;
    } else if (now < stayUntil) {
      label.textContent = "New starts are closed";
      countdown.textContent = `Until ${formatTime(stayUntil)}`;
      copy.textContent = "If your family already started, continue your hunt. Families may stay in the forest with lunches and snacks.";
    } else {
      label.textContent = "Daytime forest period finished";
      countdown.textContent = "—";
      copy.textContent = "Please follow staff instructions for the next event or the marshmallow area.";
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
    setFeedback("Your order is ready. Find your first ghost.", "is-muted");
  };

  const processGhostScan = () => {
    if (!ghostParam) return;
    const state = readState();
    if (!state) {
      $("#panel-candy").hidden = false;
      $("#hunt-start").hidden = false;
      setFeedback("Start your family hunt first, then scan the ghost again.", "is-muted");
      return;
    }
    if (state.nextIndex >= config.ghosts.length) return;
    const scanned = ghostById(ghostParam);
    if (!scanned) {
      setFeedback("That Booha signal is mysterious. Check the event QR code.", "is-wrong");
      return;
    }
    if (state.found.includes(scanned.id)) {
      setFeedback(`${scanned.label} is already in your collection. Keep looking for your current target.`, "is-muted");
      return;
    }
    const targetId = state.order[state.nextIndex];
    if (scanned.id !== targetId) {
      setFeedback(`Not yet! Your current target is ${ghostById(targetId).label}. Nothing is lost.`, "is-wrong");
      return;
    }
    state.found.push(scanned.id);
    state.nextIndex += 1;
    if (state.nextIndex >= config.ghosts.length) state.completedAt = Date.now();
    saveState(state);
    playReward();
    renderTarget(state);
    if (state.completedAt) setFeedback("All ten ghosts found! Show your completion screen to Bryan.");
    else setFeedback(`${scanned.label} found! Booha says: keep going.`, "");
  };

  const selectTab = (tabName) => {
    $$(".tab").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === tabName));
    $$(".tab-panel").forEach((panel) => {
      const active = panel.dataset.panel === tabName;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
    if (tabName === "candy") updateStatus();
  };

  $("#location-copy").textContent = config.sections.location.body;
  $("#bring-copy").textContent = config.sections.bring.body;
  $("#safety-copy").textContent = config.sections.safety.body;
  $("#schedule-copy").textContent = config.sections.schedule.body;
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
