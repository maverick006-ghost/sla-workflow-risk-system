// 🔥 BACKEND API (LIVE)
const API = "https://govpulse-backend-sbgz.onrender.com";

let DATA = [];
let filter = "all";
let search = "";

// ---------- LOAD DATA ----------
async function loadData() {
    try {
        console.log("Fetching data...");
        const res = await fetch(`${API}/services/explain`);

        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);

        const json = await res.json();
        console.log("Data received:", json);

        // 🔥 CRITICAL FIX: Map Backend Keys to Frontend UI Keys
        DATA = json.map((item, index) => ({
            id: index,
            district: item.department,      // Map 'department' to 'district' column
            mandal: item.service_name,      // Map 'service_name' to 'mandal' column
            // Logic to determine High/Normal risk based on backend string
            risk: (item.workflow_risk === "High Delay Risk") ? "High" : "Normal",
            delayed: item.delayed_roles || [],
            ai: item.ai_explanation
        }));

        updateStats();
        renderTable();

    } catch (err) {
        console.error("Failed to load data:", err);
        document.getElementById("table-body").innerHTML =
            `<tr><td colspan="5" style="text-align:center; color: red;">Error loading data. Check Console.</td></tr>`;
    }
}

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

        // UI Logic for Badge Color
        const badgeClass = d.risk === "High" ? "high" : "normal";

        row.innerHTML = `
            <td>${d.district}</td>
            <td>${d.mandal}</td>
            <td><span class="badge ${badgeClass}">${d.risk}</span></td>
            <td>${d.delayed.join(", ") || "-"}</td>
            <td style="color:#2563eb; cursor:pointer">View Details →</td>
        `;

        // Pass the specific data object to the modal
        row.onclick = () => openModal(d);
        body.appendChild(row);
    });
}

// ---------- MODAL ----------
function openModal(d) {
    if (!d || !d.ai) return;

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

// Close modal when clicking outside
window.onclick = function (event) {
    const modal = document.getElementById("modal");
    if (event.target === modal) {
        closeModal();
    }
}

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", loadData);