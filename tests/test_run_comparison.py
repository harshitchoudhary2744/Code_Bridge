import urllib.request
import json
import time

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
        {"input": [-5, 10], "expectedOutput": 5},
        {"input": [0, 0], "expectedOutput": 0}
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
print(f"Job created: {job_id}, status: {job['status']}")

for i in range(40):
    time.sleep(1)
    with urllib.request.urlopen(f"http://localhost:4000/api/v1/comparisons/{job_id}") as chk_resp:
        chk = json.loads(chk_resp.read().decode("utf-8"))
    
    print(f"Poll {i+1}: status={chk['status']}")
    if chk["status"] in ["COMPLETED", "FAILED"]:
        for run in chk["modelRuns"]:
            print(f"\n==========================================")
            print(f"Model: {run['modelMetadataSnapshot']['displayName']}")
            print(f"Status: {run['status']}")
            print(f"Candidate:\n{run['candidateCode']}")
            print(f"Tests passed: {run['passedTestsCount']}/{run['totalTestsCount']}")
            if run.get("compilerDiagnostics"):
                print(f"Diagnostics: {run['compilerDiagnostics']}")
            for g in run.get("gates", []):
                print(f"  Gate: {g['gate']} -> passed={g['passed']}, status={g['status']}")
        break
