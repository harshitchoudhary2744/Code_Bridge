import urllib.request
import json
import time

def main():
    body = {
        "sourceLanguage": "python",
        "sourceVersion": "3.11",
        "targetLanguage": "java",
        "targetVersion": "17",
        "sourceCode": "def add(a: int, b: int) -> int:\n    return a + b\n",
        "entryPoint": {"kind": "function", "name": "add"},
        "tests": [
            {"input": [2, 3], "expectedOutput": 5},
            {"input": [-1, 1], "expectedOutput": 0}
        ],
        "modelIds": ["salesforce-codet5-small", "uclanlp-plbart-base"],
        "mode": "validate",
        "generation": {"maxNewTokens": 64, "numBeams": 1}
    }

    print("[Live Test] Submitting comparison job to http://localhost:4000/api/v1/comparisons...")
    req = urllib.request.Request(
        "http://localhost:4000/api/v1/comparisons",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        job_id = data["id"]
        print(f"[Live Test] Submitted job ID: {job_id} (initial status: {data['status']})")

    for i in range(30):
        time.sleep(1)
        with urllib.request.urlopen(f"http://localhost:4000/api/v1/comparisons/{job_id}") as resp:
            job = json.loads(resp.read().decode("utf-8"))
            status = job["status"]
            print(f"  Poll {i+1}s: {status}")
            if status in ["COMPLETED", "FAILED"]:
                print("\n[Live Test] Final Job Result:")
                print(f"  Job ID: {job['id']}")
                print(f"  Status: {job['status']}")
                for r in job["modelRuns"]:
                    print(f"  - Model: {r['modelId']}")
                    print(f"    Candidate Code: {repr(r.get('candidateCode'))}")
                    print(f"    Run Status: {r['status']}")
                    print(f"    Generation Latency: {r.get('generationTimeMs')} ms")
                    print(f"    Passed Tests: {r['passedTestsCount']}/{r['totalTestsCount']}")
                    if r.get("compilerDiagnostics"):
                        print(f"    Compiler Diag snippet: {r['compilerDiagnostics'][:100].strip()}...")
                break

    # Also test CSV export endpoint
    csv_url = f"http://localhost:4000/api/v1/reports/{job_id}?format=csv"
    with urllib.request.urlopen(csv_url) as resp:
        csv_text = resp.read().decode("utf-8")
        print("\n[Live Test] Verified CSV Report Export:")
        print(csv_text.strip())

if __name__ == "__main__":
    main()

