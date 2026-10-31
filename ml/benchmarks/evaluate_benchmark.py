"""
TransCode Lab — Reproducible Benchmark Evaluation Script
Evaluates held-out benchmark problems across configured model checkpoints.
"""

import os
import sys
import json
import time
import argparse

# Ensure service packages are importable
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
sys.path.insert(0, ROOT_DIR)

from services.model_service.src.schemas import GenerationConfig
from services.model_service.src.registry import ModelRegistry
from services.execution_runner.src.schemas import ValidationRequest, EntryPoint, TestCase
from services.execution_runner.src.validators.differential import DifferentialEvaluator

def run_benchmark(
    fixture_path: str = "tests/fixtures/python_java_benchmark.json",
    model_ids = None,
    source_lang: str = "python",
    target_lang: str = "java",
    limit: int = 4,
    output_path: str = "ml/benchmarks/results_summary.json"
):
    if model_ids is None:
        model_ids = ["salesforce-codet5-small", "uclanlp-plbart-base"]

    print(f"\n=======================================================")
    print(f"TransCode Lab Benchmark Evaluation")
    print(f"Fixture: {fixture_path}")
    print(f"Direction: {source_lang} -> {target_lang}")
    print(f"Models: {', '.join(model_ids)}")
    print(f"Limit: {limit} problems")
    print(f"=======================================================\n")

    with open(fixture_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    problems = data.get("problems", [])[:limit]
    registry = ModelRegistry()
    evaluator = DifferentialEvaluator()

    summary_results = []

    for model_id in model_ids:
        adapter = registry.get_model(model_id)
        if not adapter:
            print(f"[Error] Model {model_id} not in registry.")
            continue

        print(f"\nEvaluating Model: {adapter.metadata().displayName} ({model_id})")
        adapter.load("cpu")

        syntax_passes = 0
        compile_passes = 0
        behavioral_passes = 0
        latencies = []
        failure_breakdown = {}

        for p_idx, prob in enumerate(problems, 1):
            src_code = prob["pythonCode"] if source_lang == "python" else prob["javaCode"]
            ep = EntryPoint(**prob["entryPoint"])
            tests = [TestCase(**t) for t in prob["tests"]]

            # 1. Inference
            trans_res = adapter.translate(
                source_code=src_code,
                source_language=source_lang,
                target_language=target_lang,
                generation_config=GenerationConfig(maxNewTokens=128, numBeams=1)
            )

            latencies.append(trans_res.generationTimeMs)

            # 2. Validation
            val_req = ValidationRequest(
                sourceLanguage=source_lang,
                targetLanguage=target_lang,
                sourceCode=src_code,
                candidateCode=trans_res.candidateCode,
                entryPoint=ep,
                tests=tests
            )
            val_res = evaluator.evaluate(val_req)

            # Record stats
            syn_gate = next((g for g in val_res.gates if g.gate == "syntax"), None)
            if syn_gate and syn_gate.passed:
                syntax_passes += 1

            comp_gate = next((g for g in val_res.gates if g.gate == "compilation"), None)
            if comp_gate and comp_gate.passed:
                compile_passes += 1
            elif target_lang == "python" and syn_gate and syn_gate.passed:
                compile_passes += 1

            if val_res.overallStatus == "PASSED_AVAILABLE_TESTS":
                behavioral_passes += 1
            else:
                cat = val_res.failureCategory or "UNKNOWN"
                failure_breakdown[cat] = failure_breakdown.get(cat, 0) + 1

            print(f"  Problem #{p_idx} [{prob['id']}]: status={val_res.overallStatus} ({val_res.passedTestsCount}/{val_res.totalTestsCount} tests passed, latency={trans_res.generationTimeMs}ms)")

        latencies.sort()
        median_lat = latencies[len(latencies)//2] if latencies else 0

        model_stat = {
            "modelId": model_id,
            "displayName": adapter.metadata().displayName,
            "totalProblems": len(problems),
            "syntaxPassRate": round(syntax_passes / len(problems), 3) if problems else 0,
            "compilePassRate": round(compile_passes / len(problems), 3) if problems else 0,
            "behavioralPassRate": round(behavioral_passes / len(problems), 3) if problems else 0,
            "medianLatencyMs": round(median_lat, 1),
            "failureBreakdown": failure_breakdown
        }
        summary_results.append(model_stat)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(summary_results, f, indent=2)

    print(f"\n[Done] Benchmark evaluation saved to {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run reproducible code translation benchmark")
    parser.add_argument("--fixture", default="tests/fixtures/python_java_benchmark.json")
    parser.add_argument("--source_lang", default="python")
    parser.add_argument("--target_lang", default="java")
    parser.add_argument("--limit", type=int, default=4)
    parser.add_argument("--output", default="ml/benchmarks/results_summary.json")

    args = parser.parse_args()
    run_benchmark(
        fixture_path=args.fixture,
        source_lang=args.source_lang,
        target_lang=args.target_lang,
        limit=args.limit,
        output_path=args.output
    )
