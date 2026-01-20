// 🔥 BACKEND API (LIVE)
const API = "https://govpulse-backend-sbgz.onrender.com";

let DATA = [];
let filter = "all";
let search = "";
let myChart = null;
let currentLang = "en"; // Default Language

// 🌍 TRANSLATION DICTIONARY
const TRANSLATIONS = {
    en: {
        dashboard: "Dashboard", reports: "Reports", settings: "Settings",
        title: "Government Service SLA Risk Dashboard",
        live: "System Live • Last updated:",
        export: "⬇ Export Report",
        total_services: "Total Services Monitored",
        high_risk: "High Risk Services",
        normal_sla: "Normal SLA Services",
        all_risks: "All Risks",
        dept: "Department", service: "Service Name", risk_level: "Delay Risk", delayed_role: "Delayed Roles", action: "Action",
        close: "Close",
        view_details: "View Details →",
        "Revenue": "Revenue", "Civil Supplies": "Civil Supplies", "PR&RD & MAUD": "PR&RD & MAUD",
        "Income Certificate": "Income Certificate", "New Rice Card": "New Rice Card", "Marriage Certificate": "Marriage Certificate", "No Property Application Service": "No Property Application Service",
        "High": "High", "Normal": "Normal"
    },
    te: {
        dashboard: "డ్యాష్‌బోర్డ్", reports: "నివేదికలు", settings: "సెట్టింగులు",
        title: "ప్రభుత్వ సేవల SLA రిస్క్ డ్యాష్‌బోర్డ్",
        live: "సిస్టమ్ లైవ్ • చివరిగా అప్‌డేట్ చేయబడింది:",
        export: "⬇ నివేదికను ఎగుమతి చేయండి",
        total_services: "మొత్తం సేవలు",
        high_risk: "అధిక ప్రమాద సేవలు",
        normal_sla: "సాధారణ SLA సేవలు",
        all_risks: "అన్ని ప్రమాదాలు",
        dept: "శాఖ", service: "సేవ పేరు", risk_level: "ఆలస్య ప్రమాదం", delayed_role: "ఆలస్యమైన పాత్రలు", action: "చర్య",
        close: "మూసివేయి",
        view_details: "వివరాలు చూడండి →",
        "Revenue": "రెవెన్యూ", "Civil Supplies": "పౌర సరఫరాలు", "PR&RD & MAUD": "పంచాయతీ రాజ్ & గ్రామీణాభివృద్ధి",
        "Income Certificate": "ఆదాయ ధృవీకరణ పత్రం", "New Rice Card": "కొత్త బియ్యం కార్డు", "Marriage Certificate": "వివాహ ధృవీకరణ పత్రం", "No Property Application Service": "ఆస్తి లేని దరఖాస్తు సేవ",
        "High": "అధికం", "Normal": "సాధారణం"
    }
};

// ---------- LOAD DATA ----------
async function loadData() {
    try {
        const res = await fetch(`${API}/services/explain`);
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);

        const json = await res.json();

        DATA = json.map((item, index) => ({
            id: index,
            district: item.department,
            mandal: item.service_name,
            risk: (item.workflow_risk === "High Delay Risk") ? "High" : "Normal",
            delayed: item.delayed_roles || [],
            ai: item.ai_explanation,
            workflow_risk: item.workflow_risk,
            sla_days: item.sla_days,
            workflow_steps: item.workflow_steps
        }));

        updateStats();
        renderTable();
        renderChart();
        updateTime();

        // 🔥 STATE CHANGE: LOADING -> READY
        setTimeout(() => {
            document.getElementById("loading-state").classList.add("hidden");
            document.getElementById("ready-state").classList.remove("hidden");
        }, 1200);

    } catch (err) {
        console.error("Failed to load data:", err);
        // Show error on splash screen
        document.getElementById("loading-state").innerHTML =
            `<p style="color:#ef4444; font-weight:bold;">⚠ Connection Failed. Please Refresh.</p>`;
    }
}

// 🔥 ENTER DASHBOARD ANIMATION
function enterDashboard() {
    document.getElementById("intro-screen").classList.add("slide-up");
}

// ---------- TRANSLATION LOGIC ----------
function toggleLanguage() {
    currentLang = currentLang === "en" ? "te" : "en";
    document.getElementById("lang-btn").innerText = currentLang === "en" ? "తెలుగు" : "English";

    // Translate UI Elements
    document.querySelectorAll("[data-key]").forEach(el => {
        const key = el.getAttribute("data-key");
        if (TRANSLATIONS[currentLang][key]) {
            el.innerText = TRANSLATIONS[currentLang][key];
        }
    });

    renderTable(); // Re-render table to translate data
}

// ---------- TABLE RENDER ----------
function renderTable() {
    const body = document.getElementById("table-body");
    body.innerHTML = "";

    // Helper to get translated string
    const t = (text) => TRANSLATIONS[currentLang][text] || text;

    const filtered = DATA.filter(d =>
        (filter === "all" || d.risk === filter) &&
        (d.district + d.mandal).toLowerCase().includes(search)
    );

    filtered.forEach(d => {
        const row = document.createElement("tr");
        const badgeClass = d.risk === "High" ? "high" : "normal";

        row.innerHTML = `
            <td>${t(d.district)}</td>
            <td>${t(d.mandal)}</td>
            <td><span class="badge ${badgeClass}">${t(d.risk)}</span></td>
            <td>${d.delayed.join(", ") || "-"}</td>
            <td style="color:#2563eb; cursor:pointer">${t("view_details")}</td>
        `;

        row.onclick = () => openModal(d);
        body.appendChild(row);
    });
}

// ---------- STATS ----------
function updateStats() {
    document.getElementById("total-apps").innerText = DATA.length;
    document.getElementById("high-risk-apps").innerText = DATA.filter(d => d.risk === "High").length;
    document.getElementById("normal-apps").innerText = DATA.filter(d => d.risk === "Normal").length;
}

// ---------- CHART ----------
function renderChart() {
    const ctxElement = document.getElementById('riskChart');
    if (!ctxElement) return;
    const ctx = ctxElement.getContext('2d');

    const highCount = DATA.filter(d => d.risk === "High").length;
    const normalCount = DATA.filter(d => d.risk === "Normal").length;

    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['High Risk', 'Normal'],
            datasets: [{
                data: [highCount, normalCount],
                backgroundColor: ['#ef4444', '#10b981'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right' } },
            cutout: '70%'
        }
    });
}

// ---------- EXPORT CSV ----------
function exportCSV() {
    if (DATA.length === 0) { alert("No data!"); return; }
    let csvContent = "data:text/csv;charset=utf-8,Department,Service Name,Risk Level,SLA Days,Steps\n";
    DATA.forEach(d => {
        const row = [d.district, d.mandal, d.risk, d.sla_days, d.workflow_steps].join(",");
        csvContent += row + "\n";
    });
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "govpulse_report.csv";
    link.click();
}

function updateTime() { document.getElementById("last-updated").innerText = new Date().toLocaleTimeString(); }

// ---------- MODAL ----------
function openModal(d) {
    if (!d || !d.ai) return;
    document.getElementById("modal-title").innerText = `${d.district} - ${d.mandal}`;
    document.getElementById("ai-summary").innerText = d.ai.summary;
    document.getElementById("ai-details").innerText = d.ai.details;
    document.getElementById("ai-whatif").innerText = d.ai.what_if;
    document.getElementById("modal").classList.remove("hidden");
}
function closeModal() { document.getElementById("modal").classList.add("hidden"); }

// ---------- EVENTS & INIT ----------
document.getElementById("search-input").addEventListener("input", e => { search = e.target.value.toLowerCase(); renderTable(); });
document.getElementById("risk-filter").addEventListener("change", e => { filter = e.target.value; renderTable(); });
window.onclick = function (event) { if (event.target === document.getElementById("modal")) closeModal(); }
document.addEventListener("DOMContentLoaded", loadData);