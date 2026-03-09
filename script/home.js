// local temporary storage
var TOKEN_KEY = "git_tracker_auth";
if (!sessionStorage.getItem(TOKEN_KEY)) {
  window.location.href = "index.html";
}


//  API
const API = "https://phi-lab-server.vercel.app/api/v1/lab";
var TOKEN_KEY = "git_tracker_auth";

let allIssues = [];
let currentTab = "all";
let searchTimer;


//  LOGOUT
function handleLogout() {
  sessionStorage.removeItem(TOKEN_KEY);
  window.location.replace("index.html");
}

//  FETCH — ALL ISSUES FROM API
async function loadAllIssues() {
  setLoading(true);
  try {
    const res = await fetch(`${API}/issues`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    allIssues = extractArray(json);
    if (allIssues.length)
      //   console.log("[API] sample issue:", allIssues[0]);
      renderIssues(applyTab(allIssues, currentTab));
  } catch (err) {
    // console.error("[loadAllIssues]", err);
    showError("Failed to load issues. Check your connection.");
  } finally {
    setLoading(false);
  }
}


//  FETCH — SINGLE ISSUE
async function fetchSingle(id) {
  const res = await fetch(`${API}/issue/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.issue ?? json.data ?? json;
}


//  FETCH — SEARCH
async function fetchSearch(q) {
  const res = await fetch(`${API}/issues/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return extractArray(json);
}


//  EXTRACT ARRAY
function extractArray(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.issues)) return json.issues;
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json.result)) return json.result;
  for (const v of Object.values(json)) {
    if (Array.isArray(v)) return v;
  }
  return [];
}

//  TAB FILTER
function applyTab(issues, tab) {
  if (tab === "all") return issues;
  return issues.filter(
    (i) => (i.status ?? i.state ?? "").toLowerCase() === tab,
  );
}


//  RENDER GRID
function renderIssues(issues) {
  const grid = get("issuesGrid");
  const empty = get("emptyState");
  const label = currentTab === "all" ? "Total" : cap(currentTab);

  get("issueCountText").textContent =
    `${issues.length} ${label} Issue${issues.length !== 1 ? "s" : ""}`;

  if (!issues.length) {
    grid.classList.add("hidden");
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");
  grid.innerHTML = issues.map(buildCard).join("");
  grid.classList.remove("hidden");
  grid.classList.remove("fade-up");
  void grid.offsetWidth;
  grid.classList.add("fade-up");
}


//  BUILD CARD 
function buildCard(issue) {
  const status = (issue.status ?? issue.state ?? "open").toLowerCase();
  const isOpen = status === "open";
  const id = issue.id ?? issue._id ?? issue.number ?? "";
  const title = esc(issue.title ?? "Untitled");
  const desc = esc(
    issue.body ?? issue.description ?? "No description provided.",
  );
  const author = esc(
    issue.author ??
      issue.user?.login ??
      issue.created_by ??
      issue.assignee ??
      "Unknown",
  );
  const priRaw = (issue.priority ?? "").toLowerCase();
  const date = fmtDate(issue.createdAt ?? issue.created_at ?? issue.date ?? "");
  const labelChips = buildLabelChips(issue.labels ?? issue.label ?? "");
  const borderCls = isOpen ? "card-open" : "card-closed";

  // Status icon 
  const statusIcon = isOpen
    ? `<span class="w-7 h-7 rounded-full border-2 border-[#00A96E] flex items-center justify-center shrink-0">
         <i class="fa-solid fa-arrows-rotate text-[#00A96E] text-xs"></i>
       </span>`
    : `<span class="w-7 h-7 rounded-full border-2 border-purple-400 flex items-center justify-center shrink-0">
         <i class="fa-solid fa-check text-purple-500 text-xs"></i>
       </span>`;

  // Priority badge 
  const prioBadge = priRaw.includes("high")
    ? `<span class="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-md">HIGH</span>`
    : priRaw.includes("medium")
      ? `<span class="bg-yellow-100 text-yellow-600 text-[10px] font-bold px-2 py-0.5 rounded-md">MEDIUM</span>`
      : priRaw.includes("low")
        ? `<span class="bg-green-100 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-md">LOW</span>`
        : "";

  return `
  <div class="issue-card bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3 ${borderCls}"
    onclick="openModal('${id}')">

    <div class="flex items-center justify-between">
      ${statusIcon}
      ${prioBadge}
    </div>

    <h3 class="text-sm font-bold text-gray-900 leading-snug line-clamp-2">${title}</h3>

    <p class="text-xs text-gray-400 leading-relaxed line-clamp-3">${desc}</p>

    <div class="flex flex-wrap gap-1.5">${labelChips}</div>

    <div class="h-px bg-gray-100 mt-auto"></div>

    <div class="flex flex-col gap-0.5">
      <p class="text-xs text-gray-500 font-medium">#${id} by ${author}</p>
      <p class="text-xs text-gray-400">${date}</p>
    </div>
  </div>`;
}


//  OPEN MODAL
async function openModal(id) {
  const modal = get("issueModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  get("modalContent").innerHTML = `<div class="flex justify-center py-12">
       <span class="loading loading-spinner loading-md text-indigo-500"></span>
     </div>`;

  try {
    let issue = allIssues.find(
      (i) => String(i.id ?? i._id ?? i.number) === String(id),
    );
    if (!issue) issue = await fetchSingle(id);
    get("modalContent").innerHTML = buildModal(issue);
  } catch (err) {
    console.error("[openModal]", err);
    get("modalContent").innerHTML =
      `<p class="text-red-500 text-sm py-4">Could not load issue details.</p>`;
  }
}


//  CREATE MODAL 
function buildModal(issue) {
  const status = (issue.status ?? issue.state ?? "open").toLowerCase();
  const isOpen = status === "open";
  const title = esc(issue.title ?? "Untitled");
  const desc = esc(
    issue.body ?? issue.description ?? "No description provided.",
  );
  const author = esc(
    issue.author ??
      issue.user?.login ??
      issue.created_by ??
      issue.assignee ??
      "Unknown",
  );
  const prio = esc(issue.priority ?? "N/A");
  const date = fmtDate(issue.createdAt ?? issue.created_at ?? issue.date ?? "");
  const labels =
    buildLabelChips(issue.labels ?? issue.label ?? "") ||
    `<span class="text-xs text-gray-400">No labels</span>`;

  // Status badge 
  const statusBadge = isOpen
    ? `<span class="inline-flex items-center gap-1.5 bg-[#00A96E] text-white text-xs font-semibold px-3 py-1 rounded-full">
          Opened
       </span>`
    : `<span class="inline-flex items-center gap-1.5 bg-purple-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
         </i> Closed
       </span>`;

  // Priority pill 
  const prioPill = prio.toLowerCase().includes("high")
    ? `<span class="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">HIGH</span>`
    : prio.toLowerCase().includes("medium")
      ? `<span class="bg-yellow-400 text-white text-xs font-bold px-3 py-1 rounded-full">MEDIUM</span>`
      : prio.toLowerCase().includes("low")
        ? `<span class="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">LOW</span>`
        : `<span class="text-sm font-semibold text-gray-700">${prio}</span>`;

  return `
  <div class="flex items-start justify-between gap-3 mb-3">
    <h2 class="text-xl font-bold text-gray-900 leading-snug flex-1">${title}</h2>
    <button onclick="closeModal()"
      class="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
      <i class="fa fa-times"></i>
    </button>
  </div>

  <div class="flex items-center gap-2 flex-wrap mb-4">
    ${statusBadge}
    <span class="text-sm text-gray-400">
      • Opened by <span >${author}</span>
      • ${date}
    </span>
  </div>

  <div class="flex flex-wrap gap-2 mb-5">${labels}</div>

  <p class="text-sm text-gray-600 leading-relaxed mb-6">${desc}</p>

  <div class="bg-gray-50 rounded-2xl p-4 flex items-center justify-between gap-4">
    <div>
      <p class="text-sm text-gray-500 mb-1">Assignee:</p>
      <p class="text-sm font-bold text-gray-900">${author}</p>
    </div>
    <div class="text-right">
      <p class="text-sm text-gray-500 mb-1">Priority:</p>
      ${prioPill}
    </div>
  </div>

  <div class="flex justify-end mt-5">
    <button onclick="closeModal()"
      class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-xl text-sm transition">
      Close
    </button>
  </div>`;
}

//  CLOSE MODAL
function closeModal() {
  const m = get("issueModal");
  m.classList.add("hidden");
  m.classList.remove("flex");
}

document.addEventListener("DOMContentLoaded", () => {
  loadAllIssues();
  get("issueModal").addEventListener("click", (ev) => {
    if (ev.target === get("issueModal")) closeModal();
  });
});

//  TABS
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".tab-pill").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.tab === tab);
  });
  const q = val("searchInput");
  if (q) handleSearch(q);
  else renderIssues(applyTab(allIssues, currentTab));
}

//  SEARCH
function handleSearch(q) {
  clearTimeout(searchTimer);
  if (!q.trim()) {
    renderIssues(applyTab(allIssues, currentTab));
    return;
  }
  searchTimer = setTimeout(async () => {
    setLoading(true);
    try {
      const results = await fetchSearch(q.trim());
      renderIssues(applyTab(results, currentTab));
    } catch {
      const lq = q.toLowerCase();
      renderIssues(
        applyTab(allIssues, currentTab).filter(
          (i) =>
            (i.title ?? "").toLowerCase().includes(lq) ||
            (i.body ?? i.description ?? "").toLowerCase().includes(lq) ||
            (i.author ?? "").toLowerCase().includes(lq) ||
            (i.category ?? "").toLowerCase().includes(lq),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, 350);
}

//  HELPERS
function setLoading(on) {
  get("loadingSpinner").classList.toggle("hidden", !on);
  if (on) {
    get("issuesGrid").classList.add("hidden");
    get("emptyState").classList.add("hidden");
  }
}

function showError(msg) {
  const empty = get("emptyState");
  empty.classList.remove("hidden");
  empty.innerHTML = `<i class="fa fa-circle-exclamation text-4xl text-red-300 mb-3"></i>
     <p class="text-sm text-red-400">${msg}</p>`;
}

// Label chips 
function buildLabelChips(raw) {
  if (!raw) return "";

  function chipClasses(name) {
    const n = name.toLowerCase();
    if (n.includes("bug"))
      return "bg-red-50 text-red-500 uppercase border border-red-200";
    if (n.includes("help"))
      return "bg-yellow-50 text-yellow-600 uppercase border border-yellow-200";
    if (n.includes("enhancement"))
      return "bg-green-50 text-green-600 uppercase border border-green-200";
    if (n.includes("feature"))
      return "bg-blue-50 text-blue-600 uppercase border border-blue-200";
    if (n.includes("question"))
      return "bg-purple-50 text-purple-600 uppercase border border-purple-200";
    if (n.includes("doc"))
      return "bg-sky-50 text-sky-600 uppercase border border-sky-200";
    return "bg-gray-100 text-gray-600 uppercase border border-gray-200";
  }

  function labelEmoji(name) {
    const n = name.toLowerCase();
    if (n.includes("bug")) return "<i class='fa-solid fa-bug'></i> ";
    if (n.includes("help")) return "<i class='fa-regular fa-life-ring'></i>";
    if (n.includes("enhancement"))
      return "<i class='fa-solid fa-hand-sparkles'></i> ";
    if (n.includes("feature"))
      return "<i class='fa-solid fa-circle-exclamation'></i>";
    if (n.includes("question")) return "❓ ";
    if (n.includes("doc")) return "<i class='fa-regular fa-file'></i> ";
    return "";
  }

  const toChip = (name) => {
    const label = name.trim();
    if (!label) return "";
    return `<span class="inline-flex items-center gap-1 ${chipClasses(label)} text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap">${labelEmoji(label)}${esc(label)}</span>`;
  };

  if (typeof raw === "string")
    return raw.split(",").filter(Boolean).map(toChip).join("");
  if (Array.isArray(raw))
    return raw
      .slice(0, 4)
      .map((l) => toChip(typeof l === "string" ? l : (l.name ?? "")))
      .join("");
  return "";
}

//  UTILS
function get(id) {
  return document.getElementById(id);
}
function val(id) {
  return get(id).value.trim();
}
function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtDate(d) {
  if (!d) return "N/A";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(d);
  }
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
