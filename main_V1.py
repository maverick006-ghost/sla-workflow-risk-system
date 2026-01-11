print(">>> ACTIVE main.py LOADED <<<")

from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from fastapi import FastAPI

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # allow all for hackathon/demo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------ DATA ------------------

services = [
    {
        "id": 1,
        "service_name": "Income Certificate",
        "department": "Revenue",
        "sla_days": 30
    },
    {
        "id": 2,
        "service_name": "Rice Card",
        "department": "Civil Supplies",
        "sla_days": 15
    },
    {
        "id": 3,
        "service_name": "Pension Application",
        "department": "Social Welfare",
        "sla_days": 45
    }
]

workflows = {
    "Income Certificate": ["DA", "VRO", "RI", "Tahsildar", "RDO"],
    "Rice Card": ["DA", "Tahsildar"],
    "Pension Application": ["DA", "RI", "Tahsildar", "RDO", "Director"]
}

# ------------------ LOGIC ------------------

def sla_risk(sla_days: int) -> str:
    if sla_days <= 15:
        return "Low"
    elif sla_days <= 30:
        return "Medium"
    else:
        return "High"

def workflow_risk(steps):
    if len(steps) >= 5:
        return "High Delay Risk"
    else:
        return "Normal"

def ai_explain_delay(service_name, workflow_risk, delayed_roles, workflow_steps):
    if workflow_risk == "High Delay Risk" and delayed_roles:
        role = delayed_roles[0]
        summary = f"The application is at high delay risk due to delays at the {role} stage."
        details = (
            f"The {role} step exceeded its SLA. With {workflow_steps} approval steps, "
            "any delay propagates to downstream approvals."
        )
        what_if = (
            f"If the {role} stage is reduced by 2 days, the overall risk becomes Normal."
        )
    else:
        summary = "The application is proceeding within acceptable SLA limits."
        details = "No approval stage has exceeded its SLA."
        what_if = "Maintaining current performance keeps the risk Normal."

    return {
        "summary": summary,
        "details": details,
        "what_if": what_if
    }

# ------------------ ROUTES ------------------

def load_income_certificate_data():
    df = pd.read_excel("data/Income certificate.xlsx")
    return df.head(5).to_dict(orient="records")

@app.get("/")
def home():
    return {"message": "SLA Pulse backend is running"}

# @app.get("/test-income-data")
# def test_income_data():
#     return load_income_certificate_data()


@app.get("/services")
def get_services():
    enriched_services = []

    for service in services:
        service_copy = service.copy()

        service_copy["sla_risk"] = sla_risk(service["sla_days"])

        name = service["service_name"]
        steps = workflows.get(name, [])

        service_copy["workflow_steps"] = len(steps)
        service_copy["workflow_risk"] = workflow_risk(steps)

        enriched_services.append(service_copy)

    return enriched_services

# @app.get("/debug")
# def debug():
#     return {
#         "file": "ACTIVE main.py",
#         "features": ["sla_risk", "workflow_risk", "workflow_steps"]
#     }

@app.get("/services/explain")
def get_services_with_explanations():
    enriched = []

    for service in services:
        name = service["service_name"]
        steps = workflows.get(name, [])
        wf_risk = workflow_risk(steps)

        # For demo, assume delayed_roles from workflow depth
        delayed_roles = ["VRO"] if wf_risk == "High Delay Risk" else []

        explanation = ai_explain_delay(
            service_name=name,
            workflow_risk=wf_risk,
            delayed_roles=delayed_roles,
            workflow_steps=len(steps)
        )

        enriched.append({
            **service,
            "sla_risk": sla_risk(service["sla_days"]),
            "workflow_steps": len(steps),
            "workflow_risk": wf_risk,
            "delayed_roles": delayed_roles,
            "ai_explanation": explanation
        })

    return enriched
