from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os

# --------------------------------------------------
# APP
# --------------------------------------------------
app = FastAPI(title="GovPulse – SLA Workflow Risk Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------
# PATHS
# --------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

# --------------------------------------------------
# HELPERS
# --------------------------------------------------
def normalize(text):
    return " ".join(str(text).lower().split())

# --------------------------------------------------
# LOAD WORKFLOW MASTER (SAFE: LOCAL + RENDER)
# --------------------------------------------------
def load_workflow_data():
    possible_paths = [
        os.path.join(os.getcwd(), "Backend", "data", "workflow.xlsx"),
        os.path.join(os.getcwd(), "data", "workflow.xlsx"),
        os.path.join(os.path.dirname(__file__), "data", "workflow.xlsx"),
    ]

    path = None
    for p in possible_paths:
        if os.path.exists(p):
            path = p
            break

    if path is None:
        print("⚠️ workflow.xlsx not found. Starting with empty workflows.")
        return {}

    df = pd.read_excel(path)
    df.columns = df.columns.str.strip().str.lower()

    workflows = {}

    for _, row in df.iterrows():
        dept = row.get("department name")
        service = row.get("service name")
        sla = row.get("sla")
        rural = row.get("workflow (rural)")

        if pd.isna(dept) or pd.isna(service):
            continue

        workflows[normalize(service)] = {
            "department": dept,
            "sla_days": int(str(sla).split()[0]) if not pd.isna(sla) else None,
            "steps": len(str(rural).split("->")) if not pd.isna(rural) else 0,
        }

    return workflows


WORKFLOWS = load_workflow_data()

# --------------------------------------------------
# SERVICES IN SCOPE (OPTION A – FINAL)
# --------------------------------------------------
SERVICE_FILES = [
    ("Income Certificate", "Income certificate.xlsx"),
    ("New Rice Card", "NewRiceCard.xlsx"),
    ("Marriage Certificate", "Marriage Certificate.xlsx"),
    ("No Property Application Service", "No Property Application Service.xlsx"),
]

# --------------------------------------------------
# SLA RISK LOGIC
# --------------------------------------------------
def sla_risk(days):
    if days is None:
        return "Unknown"
    if days <= 15:
        return "Low"
    elif days <= 30:
        return "Medium"
    return "High"

def workflow_risk(steps):
    return "High Delay Risk" if steps >= 4 else "Normal"

# --------------------------------------------------
# API
# --------------------------------------------------
@app.get("/")
def root():
    return {"status": "GovPulse backend running"}

@app.get("/services/explain")
def services_explain():
    results = []

    for service_name, _ in SERVICE_FILES:
        key = normalize(service_name)
        wf = WORKFLOWS.get(key, {})

        steps = wf.get("steps", 0)
        is_high_risk = steps >= 4

        results.append({
            "service_name": service_name,
            "department": wf.get("department", "Unknown"),
            "sla_days": wf.get("sla_days"),
            "sla_risk": sla_risk(wf.get("sla_days")),
            "workflow_steps": steps,
            "workflow_risk": workflow_risk(steps),
            "delayed_roles": ["VRO"] if is_high_risk else [],
            "is_high_risk": is_high_risk,
            "ai_explanation": {
                "summary": (
                    "High delay risk due to multi-level approval workflow."
                    if is_high_risk
                    else "Application is within acceptable SLA limits."
                ),
                "details": (
                    f"The workflow has {steps} approval steps."
                    + (" The VRO stage is a potential bottleneck." if is_high_risk else "")
                ),
                "what_if": (
                    "Reducing one approval step or redistributing VRO workload can normalize delays."
                    if is_high_risk
                    else "Current performance is optimal."
                )
            }
        })

    return results
