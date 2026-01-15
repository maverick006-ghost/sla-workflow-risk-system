from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os
import sys

# --------------------------------------------------
# APP SETUP
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
# ROBUST PATH CONFIGURATION
# --------------------------------------------------
# 1. Get the directory where THIS file (main_V1.py) is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 2. Define the path to the 'data' folder relative to this file
DATA_DIR = os.path.join(BASE_DIR, "data")

print(f"🚀 STARTUP DEBUG:")
print(f"   - Script location: {BASE_DIR}")
print(f"   - Looking for data in: {DATA_DIR}")

# 3. Check if data folder exists and list files (Crucial for debugging logs)
if os.path.exists(DATA_DIR):
    files = os.listdir(DATA_DIR)
    print(f"   - Files found in data folder: {files}")
else:
    print(f"   - ❌ ERROR: Data directory not found at {DATA_DIR}")

# --------------------------------------------------
# LOAD DATA
# --------------------------------------------------
def load_workflow_data():
    workflow_path = os.path.join(DATA_DIR, "workflow.xlsx")
    
    if not os.path.exists(workflow_path):
        print(f"   - ❌ CRITICAL: workflow.xlsx not found at {workflow_path}")
        return {}

    try:
        # Load Excel
        df = pd.read_excel(workflow_path)
        
        # Clean column names (remove spaces, lowercase)
        df.columns = df.columns.str.strip().str.lower()
        
        workflows = {}
        
        for _, row in df.iterrows():
            # Robustly get columns even if casing varies slightly
            dept = row.get("department name")
            service = row.get("service name")
            sla = row.get("sla")
            rural = row.get("workflow (rural)")
            
            # Skip empty rows
            if pd.isna(service):
                continue
                
            # Normalize service name key
            key = " ".join(str(service).lower().split())
            
            workflows[key] = {
                "department": dept,
                "sla_days": int(str(sla).split()[0]) if not pd.isna(sla) else None,
                "steps": len(str(rural).split("->")) if not pd.isna(rural) else 0
            }
            
        print(f"   - ✅ Successfully loaded {len(workflows)} workflows.")
        return workflows
        
    except Exception as e:
        print(f"   - ❌ Error reading Excel: {e}")
        return {}

# Load the data immediately on startup
WORKFLOWS = load_workflow_data()

# --------------------------------------------------
# SERVICE CONFIGURATION
# --------------------------------------------------
# Make sure these filenames match EXACTLY what is in your data folder
SERVICE_FILES = [
    ("Income Certificate", "Income certificate.xlsx"),
    ("New Rice Card", "NewRiceCard.xlsx"),
    ("Marriage Certificate", "Marriage Certificate.xlsx"),
    ("No Property Application Service", "No Property Application Service.xlsx"),
]

# --------------------------------------------------
# LOGIC
# --------------------------------------------------
def sla_risk(days):
    if days is None: return "Unknown"
    if days <= 15: return "Low"
    if days <= 30: return "Medium"
    return "High"

def workflow_risk(steps):
    return "High Delay Risk" if steps >= 4 else "Normal"

# --------------------------------------------------
# API ENDPOINTS
# --------------------------------------------------
@app.get("/")
def root():
    return {
        "status": "GovPulse backend running",
        "data_dir_found": os.path.exists(DATA_DIR),
        "workflows_loaded": len(WORKFLOWS)
    }

@app.get("/services/explain")
def services_explain():
    results = []

    for service_name, filename in SERVICE_FILES:
        # creating a key to look up in the dictionary
        key = " ".join(service_name.lower().split())
        
        # Fetch from loaded data
        wf = WORKFLOWS.get(key, {})
        
        steps = wf.get("steps", 0)
        is_high_risk = steps >= 4

        # Build response
        item = {
            "service_name": service_name,
            "department": wf.get("department", "Unknown"),
            "sla_days": wf.get("sla_days"),
            "sla_risk": sla_risk(wf.get("sla_days")),
            "workflow_steps": steps,
            "workflow_risk": workflow_risk(steps),
            "delayed_roles": ["VRO"] if is_high_risk else [],
            "ai_explanation": {
                "summary": "High delay risk detected." if is_high_risk else "Within SLA limits.",
                "details": f"Workflow contains {steps} steps.",
                "what_if": "Reduce approval steps." if is_high_risk else "Maintain current flow."
            }
        }
        results.append(item)

    return results