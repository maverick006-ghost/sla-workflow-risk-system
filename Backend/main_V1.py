from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
# HELPERS
# --------------------------------------------------
def normalize(text):
    return " ".join(str(text).lower().split())

# --------------------------------------------------
# DATA (HARDCODED FOR STABILITY)
# --------------------------------------------------
# We manually define the data here to ensure it works on Render
# irrespective of file paths.
WORKFLOWS = {
    "income certificate": {
        "department": "Revenue", 
        "sla_days": 30, 
        "steps": 5 # High Risk (>=4)
    },
    "new rice card": {
        "department": "Civil Supplies", 
        "sla_days": 30, 
        "steps": 2 # Normal
    },
    "marriage certificate": {
        "department": "PR&RD & MAUD", 
        "sla_days": 15, 
        "steps": 2 # Normal
    },
    "no property application service": {
        "department": "Revenue", 
        "sla_days": 15, 
        "steps": 3 # Normal
    }
}

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
    # If steps are 4 or more, it is High Risk
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
        # Fetch details from our hardcoded dictionary
        wf = WORKFLOWS.get(key, {})

        # Default to 0 if not found, but since we hardcoded, it will be found.
        steps = wf.get("steps", 0)
        
        # Risk Logic
        is_high_risk = steps >= 4
        risk_label = workflow_risk(steps)

        results.append({
            "service_name": service_name,
            "department": wf.get("department", "Unknown Department"),
            "sla_days": wf.get("sla_days"),
            "sla_risk": sla_risk(wf.get("sla_days")),
            "workflow_steps": steps,
            "workflow_risk": risk_label,
            # If high risk, blame the VRO (common bottleneck)
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