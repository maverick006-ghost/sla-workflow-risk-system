// 🔥 BACKEND API (LIVE)
const API = "https://govpulse-backend-sbgz.onrender.com";

let DATA = [];
let filter = "all";
let search = "";

// ---------- LOAD DATA ----------
async function loadData() {
    try {
        const res = await fetch(`${API}/services/explain`);
        DATA = await res.json();

        updateStats();
        renderTable();
    } catch (err) {
        console.error("Failed to load data", err);
    }
}

document.addEventListener("DOMContentLoaded", loadData);

// ---------- STATS ----------
function updateStats() {
    document.getElementById("total-apps").innerText = DATA.length;

    document.getElementById("high-risk-apps").innerText =
        DATA.filter(d => d.workflow_risk === "High Delay Risk").length;

    document.getElementById("normal-apps").innerText =
        DATA.filter(d => d.workflow_risk === "Normal").length;
}

// ---------- TABLE ----------
function renderTable() {
    const body = document.getElementById("table-body");
    body.innerHTML = "";

    const filtered = DATA.filter(d =>
        (filter === "all" || d.workflow_risk === filter) &&
        (d.department + d.service_name).toLowerCase().includes(search)
    );

    if (filtered.length === 0) {
        body.innerHTML =
            `<tr><td colspan="5" style="text-align:center">No data found</td></tr>`;
        return;
    }

    filtered.forEach(d => {
        const row = document.createElement("tr");

        const badgeClass =
            d.workflow_risk === "High Delay Risk" ? "high" : "normal";

        row.innerHTML = `
      <td>${d.department}</td>
      <td>${d.service_name}</td>
      <td>
        <span class="badge ${badgeClass}">
          ${d.workflow_risk}
        </span>
      </td>
      <td>${d.delayed_roles.length ? d.delayed_roles.join(", ") : "-"}</td>
      <td style="color:#2563eb; cursor:pointer">View Details →</td>
    `;

        row.onclick = () => openModal(d);
        body.appendChild(row);
    });
}

// ---------- MODAL ----------
function openModal(d) {
    document.getElementById("modal-title").innerText =
        `${d.department} – ${d.service_name}`;

    document.getElementById("ai-summary").innerText =
        d.ai_explanation.summary;

    document.getElementById("ai-details").innerText =
        "Details: " + d.ai_explanation.details;

    document.getElementById("ai-whatif").innerText =
        "What-if: " + d.ai_explanation.what_if;

    document.getElementById("modal").classList.remove("hidden");
}

function closeModal() {
    document.getElementById("modal").classList.add("hidden");
}

// ---------- EVENTS ----------
document.getElementById("search-input").addEventListener("input", e => {
    search = e.target.value.toLowerCase();
    renderTable();
});

document.getElementById("risk-filter").addEventListener("change", e => {
    filter = e.target.value === "all"
        ? "all"
        : e.target.value === "high"
            ? "High Delay Risk"
            : "Normal";

    renderTable();
});
