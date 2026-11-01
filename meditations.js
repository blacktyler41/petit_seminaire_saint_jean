/* DAILY WORD OF GOD: loads meditations.json and shows it on the pages.
   The data lives in meditations.json, not in this file.
   The site must be opened through a web server, not by double-clicking the HTML file. */

/* Filled in after meditations.json is loaded */
let MEDITATIONS = [];

/* Reads meditations.json and returns the list of entries */
async function loadMeditations() {
  const response = await fetch("meditations.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("meditations.json could not be loaded (status " + response.status + ")");
  }
  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("meditations.json must contain a list that starts with [");
  }
  return data;
}

/* Today's date as YYYY-MM-DD, using the visitor's own clock and timezone */
function localDayKey(date = new Date()) {
  const pad = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/* "2026-10-29" -> "Thursday 29 October 2026" */
function prettyDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

/* All meditations, newest first */
function allMeditations() {
  return [...MEDITATIONS].sort((a, b) => b.date.localeCompare(a.date));
}

/* Makes text safe to place into the page */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/* Runs fn when the page is ready */
function onReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn);
  } else {
    fn();
  }
}

/* Meditations longer than this many characters get a "Read more" button */
const PREVIEW_CHARS = 350;

/* Builds the meditation paragraphs, with a "Read more" button when the text is long */
function meditationHtml(lines) {
  const total = lines.join(" ").length;

  /* Short text: show everything, no button */
  if (total <= PREVIEW_CHARS) {
    return lines.map(line => `<p>${escapeHtml(line)}</p>`).join("");
  }

  /* Long text: count how many lines fit in the preview (at least one) */
  let used = 0;
  let count = 0;
  for (const line of lines) {
    if (count > 0 && used + line.length > PREVIEW_CHARS) break;
    used += line.length;
    count++;
  }

  const shown  = lines.slice(0, count).map(line => `<p>${escapeHtml(line)}</p>`).join("");
  const hidden = lines.slice(count).map(line => `<p>${escapeHtml(line)}</p>`).join("");

  return `
    <div>${shown}</div>
    <div class="daily-full" hidden>${hidden}</div>
    <button type="button" class="btn btn-light btn-sm mt-2 daily-readmore" aria-expanded="false">Read more</button>`;
}

/* ---------- Home page: today's section (index.html) ---------- */
function renderTodayWord() {
  const dateEl     = document.getElementById("dailyDate");
  const readingsEl = document.getElementById("dailyReadings");
  const titleEl    = document.getElementById("dailyTitle");
  const textEl     = document.getElementById("dailyText");
  if (!dateEl || !readingsEl || !titleEl || !textEl) return;

  const today = localDayKey();
  const entry = MEDITATIONS.find(m => m.date === today);
  dateEl.textContent = prettyDate(today);

  if (!entry) {
    readingsEl.innerHTML = `
      <a class="daily-btn" href="https://bible.usccb.org/" target="_blank" rel="noopener noreferrer">
        <small>Official</small><span>Today's readings</span>
      </a>`;
    titleEl.textContent = "";
    textEl.innerHTML = "<p>Today's meditation has not been posted yet. Please check back later, or read the earlier meditations.</p>";
    return;
  }

  readingsEl.innerHTML = entry.readings.map(r => `
    <a class="daily-btn" href="${r.link}" target="_blank" rel="noopener noreferrer"
       aria-label="${r.label}: ${r.ref} (opens in Bible Gateway)">
      <small>${r.label}</small>
      <span>${r.ref}</span>
    </a>`).join("");

  titleEl.textContent = entry.title;
  textEl.innerHTML = meditationHtml(entry.meditation);

  /* Connect the "Read more" button, if the text was long enough to need one */
  const button = textEl.querySelector(".daily-readmore");
  const fullEl = textEl.querySelector(".daily-full");
  if (button && fullEl) {
    button.addEventListener("click", () => {
      const opening = fullEl.hidden;      /* true when the rest is currently hidden */
      fullEl.hidden = !opening;
      button.textContent = opening ? "Read less" : "Read more";
      button.setAttribute("aria-expanded", String(opening));
    });
  }
}

/* ---------- Archive page: all meditations (meditations.html) ---------- */
function renderArchive() {
  const listEl   = document.getElementById("archiveList");
  const searchEl = document.getElementById("archiveSearch");
  const emptyEl  = document.getElementById("archiveEmpty");
  const countEl  = document.getElementById("archiveCount");
  if (!listEl || !searchEl || !emptyEl || !countEl) return;

  const entries = allMeditations();

  function draw(query) {
    const q = query.trim().toLowerCase();

    const shown = entries.filter(m => {
      if (!q) return true;
      const haystack = [
        m.title,
        m.date,
        ...m.readings.map(r => r.label + " " + r.ref),
        ...m.meditation
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });

    listEl.innerHTML = shown.map(m => `
      <article class="med-card">
        <div class="med-date">${prettyDate(m.date)}</div>
        <h2 class="h4 fw-bold mt-1 mb-3">${escapeHtml(m.title)}</h2>
        <div class="med-refs">
          ${m.readings.map(r => `
            <a href="${r.link}" target="_blank" rel="noopener noreferrer">${r.label}: ${r.ref}</a>`).join("")}
        </div>
        ${m.meditation.map(line => `<p>${escapeHtml(line)}</p>`).join("")}
      </article>`).join("");

    emptyEl.classList.toggle("d-none", shown.length > 0);
    countEl.textContent = `${shown.length} of ${entries.length} meditation${entries.length === 1 ? "" : "s"}`;
  }

  searchEl.addEventListener("input", () => draw(searchEl.value));
  draw("");
}

/* ---------- Start: load the JSON first, then fill the pages ---------- */
onReady(async () => {
  try {
    MEDITATIONS = await loadMeditations();
  } catch (error) {
    console.error(error);
    const box = document.getElementById("dailyText") || document.getElementById("archiveList");
    if (box) box.innerHTML = "<p>Meditations could not be loaded. Please try again later.</p>";
    return;
  }

  renderTodayWord();
  renderArchive();
});