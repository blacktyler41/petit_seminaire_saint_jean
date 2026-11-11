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
const PREVIEW_CHARS = 250;

/* Builds the meditation text, with a "Read more" button when it is longer than PREVIEW_CHARS */
function meditationHtml(lines) {
  const paragraphs = lines.map(line => (line || "").trim()).filter(Boolean);
  const full = paragraphs.join("\n\n");

  /* Short text: show everything, no button */
  if (full.length <= PREVIEW_CHARS) {
    return paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join("");
  }

  /* Cut at PREVIEW_CHARS, but move back to the last space so no word is split */
  let cut = full.lastIndexOf(" ", PREVIEW_CHARS);
  if (cut < 1) cut = PREVIEW_CHARS;

  const shown  = full.slice(0, cut).trimEnd();
  const hidden = full.slice(cut);   /* starts with a space, so the words join up again */

  /* The CSS below turns the blank lines between paragraphs into line breaks */
  return `
    <div class="daily-body">${escapeHtml(shown)}<span class="daily-full" hidden>${escapeHtml(hidden)}</span></div>
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
/* to show one meditation at each page */  
const PAGE_SIZE = 1;
  
/* help to search word , date title .. and turn result */
  function filterMeditations(entries, query) {
    const q = query.trim ().toLowerCase();
       if (!q) return entries;
    
    return entries.filter(m => {
      const haystack = [
        m.title,
        m.date,
        ...m.readings.map(r => r.label + " " + r.ref),
        ...m.meditation
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }
   
  /* show no meditation found when matches text is 0 */
  function meditationLabel(total, page) {
    if (total === 0) return "No meditations";
    return `Meditation ${page} of ${total}`;
  }
  
 /* get the page number from the URL query string, default to 1 if not present or invalid */
  function  pageFromUrl() {
    const n = parseInt(new URLSearchParams(window.location.search).get("n"), 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }
  
  function setPageInUrl(page, { replace = false } = {}) {
    const url = new URL(window.location.href);
    url.searchParams.set("n", page);
    if (replace) {
    history.replaceState({ page }, "", url);
    } else {
    history.pushState({ page }, "", url);
    }
  }
/* ---------- Archive page: all meditations (meditations.html) ---------- */
function renderArchive() {
  const listEl   = document.getElementById("archiveList");
  const searchEl = document.getElementById("archiveSearch");
  const emptyEl  = document.getElementById("archiveEmpty");
  const countEl  = document.getElementById("archiveCount");
  const prevBtn  = document.getElementById("archivePrev");
  const nextBtn  = document.getElementById("archiveNext");
  if (!listEl || !searchEl || !emptyEl || !countEl || !prevBtn || !nextBtn) return;

  const entries = allMeditations();   /* all meditations, newest first */
  let matches   = entries;            /* the ones that match the search */
  let page      = pageFromUrl();      /* start on the number named in the address */

  function showPage() {
    const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
    page = Math.min(Math.max(page, 1), totalPages);
    const start = (page - 1) * PAGE_SIZE;
    const items = matches.slice(start, start + PAGE_SIZE);

    listEl.innerHTML = items.map(m => `
      <article class="med-card">
        <div class="med-date">${prettyDate(m.date)}</div>
        <h2 class="h4 fw-bold mt-1 mb-3">${escapeHtml(m.title)}</h2>
        <div class="med-refs">
          ${m.readings.map(r => `
            <a href="${r.link}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.label)}: ${escapeHtml(r.ref)}</a>`).join("")}
        </div>
        ${m.meditation.map(line => `<p>${escapeHtml(line)}</p>`).join("")}
      </article>`).join("");

    countEl.textContent = meditationLabel(matches.length, page);   /* "Meditation 3 of 10" */
    emptyEl.hidden = matches.length > 0;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= totalPages;
  }

  function goTo(newPage) {
    page = newPage;
    showPage();
    setPageInUrl(page);   /* no scrolling here */
  }

  prevBtn.addEventListener("click", () => goTo(page - 1));
  nextBtn.addEventListener("click", () => goTo(page + 1));

  searchEl.addEventListener("input", () => {
    matches = filterMeditations(entries, searchEl.value);
    page = 1;
    showPage();
    setPageInUrl(page, { replace: true });
  });

  window.addEventListener("popstate", () => {
    page = pageFromUrl();
    showPage();
  });

  showPage();
}

/* Shows the "Back to top" button after the visitor scrolls down, and scrolls to the top when it is clicked */
function setupBackToTop() {
  const button = document.getElementById("backToTop");
  if (!button) return;

  const update = () => button.classList.toggle("is-visible", window.scrollY > 300);

  window.addEventListener("scroll", update, { passive: true });
  button.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  update();
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
  setupBackToTop();
});