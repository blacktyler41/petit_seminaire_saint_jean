/*const NEWS_URL = "data/news.json";
const NEWS_LIMIT = 8;
const NEWS_ARCHIVE_URL = "news.html";
const NEWS_PAGE_SIZE = 12;
const NEWS_BOX_ID = "news-list";
const NEWS_ARCHIVE_ID = "news-archive";
const NEWS_CACHE_KEY = "pssj_news_cache";

function isSafeLink(u) {
  return /^https?:\/\//i.test(u);
}

function imageUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return encodeURI(path.replace(/^\/+/, ""));
}

function formatDate(value) {
  const ms = Date.parse(value);
  if (isNaN(ms)) return value;
  return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function yearOf(n) {
  const y = String(n.date || "").slice(0, 4);
  return /^\d{4}$/.test(y) ? y : "";
}

function buildCard(n) {
  const card = document.createElement("article");
  card.className = "news-card";

  if (n.category) {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = n.category;
    card.appendChild(tag);
  }

  const content = document.createElement("div");
  content.className = "news-content";

  const h5 = document.createElement("h5");
  h5.textContent = n.title;
  content.appendChild(h5);

  if (n.date) {
    const d = document.createElement("small");
    d.className = "d-block text-muted mb-1";
    d.textContent = formatDate(n.date);
    content.appendChild(d);
  }

  const p = document.createElement("p");
  p.textContent = n.text || "";
  if (n.link && isSafeLink(n.link)) {
    p.appendChild(document.createTextNode(" "));
    const a = document.createElement("a");
    a.href = n.link;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "Get more";
    p.appendChild(a);
  }
  content.appendChild(p);
  card.appendChild(content);

  if (n.image) {
    const img = document.createElement("div");
    img.className = "news-image";
    img.style.backgroundImage = 'url("' + imageUrl(n.image) + '")';
    card.appendChild(img);
  }

  return card;
}

function buildMoreCard(items) {
  const years = items.map(yearOf).filter(Boolean).map(Number);
  let info = "Browse all " + items.length + (items.length === 1 ? " news item" : " news items");
  if (years.length) {
    const first = Math.min(...years);
    const last = Math.max(...years);
    info += " (" + (first === last ? first : first + "–" + last) + ")";
  }

  const a = document.createElement("a");
  a.className = "news-card news-more";
  a.href = NEWS_ARCHIVE_URL;
  a.setAttribute("aria-label", "More news: open the news archive");

  const icon = document.createElement("span");
  icon.className = "news-more-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "→";

  const h5 = document.createElement("h5");
  h5.textContent = "More news";

  const p = document.createElement("p");
  p.textContent = info;

  a.appendChild(icon);
  a.appendChild(h5);
  a.appendChild(p);
  return a;
}

function prepareNews(data) {
  const list = data && Array.isArray(data.items) ? data.items : [];
  return list
    .filter(n => n.title && n.published !== false)
    .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
}

async function getNews() {
  try {
    const res = await fetch(NEWS_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const items = prepareNews(await res.json());
    try { localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(items)); } catch (e) {}
    return items;
  } catch (err) {
    console.warn("News could not be loaded:", err);
    try {
      const cached = JSON.parse(localStorage.getItem(NEWS_CACHE_KEY) || "null");
      if (Array.isArray(cached) && cached.length) return cached;
    } catch (e) {}
    return null;
  }
}

function renderHome(items) {
  const box = document.getElementById(NEWS_BOX_ID);
  if (!box || !items) return;
  const shown = NEWS_LIMIT > 0 ? items.slice(0, NEWS_LIMIT) : items;
  box.innerHTML = "";
  if (!shown.length) {
    box.textContent = "No news yet.";
    return;
  }
  shown.forEach(n => box.appendChild(buildCard(n)));
  box.appendChild(buildMoreCard(items));
}

function addOption(select, value, label) {
  const o = document.createElement("option");
  o.value = value;
  o.textContent = label;
  select.appendChild(o);
}

function renderArchive(items) {
  const box = document.getElementById(NEWS_ARCHIVE_ID);
  if (!box) return;
  const yearSelect = document.getElementById("news-year");
  const searchInput = document.getElementById("news-search");
  const countEl = document.getElementById("news-count");
  const moreBtn = document.getElementById("news-load-more");

  if (!items) {
    box.textContent = "News could not be loaded. Please try again later.";
    return;
  }

  const years = [...new Set(items.map(yearOf).filter(Boolean))];
  yearSelect.innerHTML = "";
  addOption(yearSelect, "", "All years");
  years.forEach(y => addOption(yearSelect, y, y));

  const params = new URLSearchParams(location.search);
  yearSelect.value = years.includes(params.get("year")) ? params.get("year") : "";
  searchInput.value = params.get("q") || "";

  let visible = NEWS_PAGE_SIZE;

  function draw() {
    const year = yearSelect.value;
    const q = searchInput.value.trim().toLowerCase();
    const found = items.filter(n =>
      (!year || yearOf(n) === year) &&
      (!q || [n.title, n.text, n.category].filter(Boolean).join(" ").toLowerCase().includes(q))
    );

    box.innerHTML = "";
    found.slice(0, visible).forEach(n => {
      const col = document.createElement("div");
      col.className = "col-md-6 col-lg-4";
      col.appendChild(buildCard(n));
      box.appendChild(col);
    });

    let text = found.length === 0 ? "No news found." : found.length + (found.length === 1 ? " news item" : " news items");
    if (found.length && year) text += " in " + year;
    countEl.textContent = text;
    moreBtn.hidden = found.length <= visible;

    const next = new URLSearchParams();
    if (year) next.set("year", year);
    if (q) next.set("q", searchInput.value.trim());
    try { history.replaceState(null, "", location.pathname + (next.toString() ? "?" + next.toString() : "")); } catch (e) {}
  }

  yearSelect.addEventListener("change", () => { visible = NEWS_PAGE_SIZE; draw(); });
  searchInput.addEventListener("input", () => { visible = NEWS_PAGE_SIZE; draw(); });
  moreBtn.addEventListener("click", () => { visible += NEWS_PAGE_SIZE; draw(); });
  draw();
}

async function startNews() {
  const items = await getNews();
  renderHome(items);
  renderArchive(items);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startNews);
} else {
  startNews();
}