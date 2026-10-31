import urllib.request
import json

job_id = "a5cc12bc-cbe5-465d-9f4f-54e820a27126"
with urllib.request.urlopen(f"http://localhost:4000/api/v1/comparisons/{job_id}") as resp:
    chk = json.loads(resp.read().decode())

failed_run = next(r for r in chk["modelRuns"] if r["status"] != "PASSED_AVAILABLE_TESTS")
print("Testing repair on failed run:", failed_run["id"])

repair_payload = {
    "jobId": job_id,
    "modelRunId": failed_run["id"],
    "repairModelId": "salesforce-codet5-finetuned",
    "maxAttempts": 2
}

req = urllib.request.Request(
    "http://localhost:4000/api/v1/repair",
    data=json.dumps(repair_payload).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)

with urllib.request.urlopen(req) as resp:
    repair_res = json.loads(resp.read().decode("utf-8"))

print(f"Repair succeeded: {repair_res['repairSucceeded']}")
print(f"Attempts count: {len(repair_res['attempts'])}")
for a in repair_res["attempts"]:
    print(f"  Attempt {a['attemptNumber']}: status={a['status']}, passed={a['passed']}")
    print(f"  Repaired code:\n{a['generatedCode']}")

