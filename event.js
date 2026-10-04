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
    renderProgress(state);

    if (complete) {
      $("#completion-copy").textContent = config.candyReward;
      $("#completion-name").textContent = state.participantLabel;
      $("#completion-time").textContent = `Completed ${formatDateTime(state.completedAt)}`;
      return;
    }

    const target = ghostById(state.order[state.nextIndex]);
    $("#target-label-jp").innerHTML = target.jp;
    $("#target-label-en").textContent = target.label;
    const targetSwatch = $("#target-swatch");
    targetSwatch.style.background = target.color;
    targetSwatch.style.setProperty("--target-color", target.color);
    targetSwatch.style.borderColor = target.id === "black" ? "#fff" : "rgba(255,255,255,.5)";
    targetSwatch.style.boxShadow = target.id === "black" ? "0 0 0 3px rgba(255,255,255,.24), 0 0 22px rgba(255,255,255,.3)" : `0 0 22px ${target.color}`;
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
          ? "受付は10:30まで / Check-in until 10:30"
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
      $("#candy-status-copy-jp").textContent = "10:30まで新しく始められます。キャンディの森は12:00までです。";
      $("#candy-status-copy-en").textContent = "New families may start until 10:30. The Candy Forest ends at 12:00.";
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

    startButton.disabled = !(now >= startsAt && now < latestStartAt);
    const state = readState();
    if (state) renderTarget(state);
    else renderProgress(null);
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

  const selectTab = (tabName, updateHash = true) => {
    $$(".tab").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === tabName));
    $$(".tab-panel").forEach((panel) => {
      const active = panel.dataset.panel === tabName;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
    document.body.dataset.theme = tabName;
    if (updateHash && window.location.hash !== `#${tabName}`) history.replaceState(null, "", `#${tabName}`);
    updateStatus();
  };

  const formatYen = (amount) => `¥${Number(amount).toLocaleString("en-US")}`;
  const prices = config.prices || { candy: 1000, zombie: 1000 };
  const bothPrice = prices.candy + prices.zombie;
  const reservationEmail = config.reservationEmail || config.contacts.email;
  const reservationBody = [
    "代表者のお名前 / Your name:",
    "電話番号 / Phone:",
    "参加するイベント / Events (キャンディの森 / ゾンビ / 両方):",
    "キャンディの森に参加する子どもの人数と学年（未就学児も含む）/ Candy Forest children and grades (incl. preschool):",
    "ゾンビに参加する子どもの人数と学年（小学生〜高校生）/ Zombie Hunt children and grades (elem.–high school):",
    "保護者の人数 / Number of adults:"
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
  $("#participant-name").addEventListener("input", (event) => event.target.setCustomValidity(""));
  window.setInterval(updateStatus, 1000);
  updateStatus();
  const hashTab = window.location.hash.slice(1);
  const initialTab = ghostParam ? "candy" : ["info", "candy", "zombie"].includes(hashTab) ? hashTab : "info";
  selectTab(initialTab, false);
  window.addEventListener("hashchange", () => {
    const nextTab = window.location.hash.slice(1);
    if (["info", "candy", "zombie"].includes(nextTab)) selectTab(nextTab, false);
  });
  processGhostScan();
})();
