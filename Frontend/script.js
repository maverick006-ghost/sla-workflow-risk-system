// 🔥 BACKEND API (LIVE)
const API = "https://govpulse-backend-sbgz.onrender.com";

let DATA = [];
let filter = "all";
let search = "";

// ---------- LOAD DATA ----------

async function loadData() {
    try {
        const res = await fetch(`${API}/services/explain`);
        const data = await res.json();
        renderDashboard(data);
    } catch (err) {
        console.error("Failed to load data", err);
    }
}

loadData();


// ---------- STATS ----------
function updateStats() {
    document.getElementById("total-apps").innerText = DATA.length;
    document.getElementById("high-risk-apps").innerText =
        DATA.filter(d => d.risk === "High").length;
    document.getElementById("normal-apps").innerText =
        DATA.filter(d => d.risk === "Normal").length;
}

// ---------- TABLE ----------
function renderTable() {
    const body = document.getElementById("table-body");
    body.innerHTML = "";

    const filtered = DATA.filter(d =>
        (filter === "all" || d.risk === filter) &&
        (d.district + d.mandal).toLowerCase().includes(search)
    );

    if (filtered.length === 0) {
        body.innerHTML =
            `<tr><td colspan="5" style="text-align:center">No data found</td></tr>`;
        return;
    }

    filtered.forEach(d => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${d.district}</td>
            <td>${d.mandal}</td>
            <td><span class="badge ${d.risk.toLowerCase()}">${d.risk}</span></td>
            <td>${d.delayed.join(", ") || "-"}</td>
            <td style="color:#2563eb; cursor:pointer">View Details →</td>
        `;

        row.onclick = () => openModal(d);
        body.appendChild(row);
    });
}

// ---------- MODAL ----------
function openModal(d) {
    document.getElementById("modal-title").innerText =
        `${d.district} - ${d.mandal}`;
    document.getElementById("ai-summary").innerText = d.ai.summary;
    document.getElementById("ai-details").innerText = d.ai.details;
    document.getElementById("ai-whatif").innerText = d.ai.what_if;
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
    filter = e.target.value;
    renderTable();
});

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", loadData);