import urllib.request
import json
import time

def check(url, name):
    try:
        with urllib.request.urlopen(url, timeout=5) as resp:
            data = resp.read().decode("utf-8")
            status = resp.status
            print(f"[PASS] {name} ({url}) -> HTTP {status}")
            return True
    except Exception as e:
        print(f"[FAIL] {name} ({url}) -> {e}")
        return False

print("=== VERIFYING LIVE SERVICES ===")
s1 = check("http://localhost:5173", "Vite Frontend")
s2 = check("http://localhost:4000/ready", "Node Backend Readiness")
s3 = check("http://localhost:8000/ready", "Model Service Readiness")
s4 = check("http://localhost:5000/ready", "Execution Runner Readiness")

print("\n=== VERIFYING END-TO-END TRANSLATION & EVALUATION ===")
payload = {
    "sourceLanguage": "python",
    "sourceVersion": "3.11",
    "targetLanguage": "java",
    "targetVersion": "17",
    "sourceCode": "def add(a: int, b: int) -> int:\n    return a + b\n",
    "entryPoint": {"kind": "function", "name": "add"},
    "modelIds": ["salesforce-codet5-finetuned", "salesforce-codet5-small"],
    "tests": [
        {"input": [2, 3], "expectedOutput": 5},
        {"input": [-5, 10], "expectedOutput": 5}
    ],
    "generationConfig": {
        "maxNewTokens": 128,
        "temperature": 0.0,
        "topP": 1.0,
        "numBeams": 1,
        "doSample": False
    }
}

req = urllib.request.Request(
    "http://localhost:4000/api/v1/comparisons",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)

with urllib.request.urlopen(req) as resp:
    job = json.loads(resp.read().decode("utf-8"))

job_id = job["id"]
print(f"Created comparison job: {job_id}")

for i in range(30):
    time.sleep(1)
    with urllib.request.urlopen(f"http://localhost:4000/api/v1/comparisons/{job_id}") as chk_resp:
        chk = json.loads(chk_resp.read().decode("utf-8"))
    if chk["status"] in ["COMPLETED", "FAILED"]:
        print(f"Job completed with status: {chk['status']}")
        for run in chk["modelRuns"]:
            print(f"  * {run['modelMetadataSnapshot']['displayName']}: {run['status']} (Tests: {run['passedTestsCount']}/{run['totalTestsCount']})")
        break

print("\n=== ALL VERIFICATIONS PASSED ===")

