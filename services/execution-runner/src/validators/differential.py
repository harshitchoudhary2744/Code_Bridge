import math
from typing import Dict, Any, List, Optional
from ..schemas import (
    ValidationRequest,
    ValidationResponse,
    GateResult,
    TestOutcome
)
from .python_runner import PythonRunner
from .java_runner import JavaRunner

class DifferentialEvaluator:
    """
    Coordinates multi-gate validation and differential execution
    between source baseline and target candidate.
    """

    def __init__(self, timeout_seconds: float = 5.0):
        self.timeout_seconds = timeout_seconds
        self.py_runner = PythonRunner(timeout_seconds=timeout_seconds)
        self.java_runner = JavaRunner(timeout_seconds=timeout_seconds)

    def _outputs_equal(self, a: Any, b: Any, float_tol: float = 1e-6) -> bool:
        """
        Compares program outputs according to strict policy:
        preserves array/collection ordering and distinguishes numeric types.
        """
        if a is None and b is None:
            return True
        if a is None or b is None:
            return False

        if isinstance(a, bool) or isinstance(b, bool):
            return a is b

        if isinstance(a, (int, float)) and isinstance(b, (int, float)):
            return math.isclose(float(a), float(b), abs_tol=float_tol)

        if isinstance(a, list) and isinstance(b, list):
            if len(a) != len(b):
                return False
            return all(self._outputs_equal(x, y, float_tol) for x, y in zip(a, b))

        if isinstance(a, dict) and isinstance(b, dict):
            if set(a.keys()) != set(b.keys()):
                return False
            return all(self._outputs_equal(a[k], b[k], float_tol) for k in a)

        # String representation fallback
        return str(a).strip() == str(b).strip()

    def evaluate(self, req: ValidationRequest) -> ValidationResponse:
        gates: List[GateResult] = []
        test_results: List[TestOutcome] = []
        compiler_diag: Optional[str] = None
        runtime_diag: Optional[str] = None
        failure_cat: Optional[str] = None
        sandbox_status = "RESTRICTED_LOCAL"

        # ----------------------------------------------------
        # Gate 1: Generation check
        # ----------------------------------------------------
        candidate = req.candidateCode
        if candidate is None or not candidate.strip():
            gen_gate = GateResult(
                gate="generation",
                passed=False,
                status="GENERATION_FAILED",
                message="Model returned empty candidate or candidate extraction failed"
            )
            return ValidationResponse(
                overallStatus="GENERATION_FAILED",
                passed=False,
                gates=[gen_gate],
                testResults=[],
                passedTestsCount=0,
                totalTestsCount=len(req.tests),
                failureCategory="EMPTY_GENERATION",
                sandboxStatus=sandbox_status
            )

        gates.append(GateResult(
            gate="generation",
            passed=True,
            status="PASSED",
            message="Valid candidate extracted"
        ))

        # ----------------------------------------------------
        # Gate 2: Target Syntax Check
        # ----------------------------------------------------
        if req.targetLanguage == "python":
            py_syntax = self.py_runner.check_syntax(candidate)
            gates.append(py_syntax)
            if not py_syntax.passed:
                return ValidationResponse(
                    overallStatus="SYNTAX_FAILED",
                    passed=False,
                    gates=gates,
                    testResults=[],
                    passedTestsCount=0,
                    totalTestsCount=len(req.tests),
                    runtimeDiagnostics=py_syntax.diagnostics,
                    failureCategory="SYNTAX_ERROR",
                    sandboxStatus=sandbox_status
                )

        # ----------------------------------------------------
        # Gate 4: Source Baseline Execution
        # Verify source code on test inputs before evaluating candidate
        # ----------------------------------------------------
        source_oracle_outputs = {}
        if req.sourceCode and req.tests:
            if req.sourceLanguage == "python":
                src_run = self.py_runner.execute_tests(req.sourceCode, req.entryPoint, req.tests)
            elif req.sourceLanguage == "java":
                src_run = self.java_runner.compile_and_run(req.sourceCode, req.entryPoint, req.tests)
            else:
                src_run = {"passed": False, "error": f"Unsupported source language: {req.sourceLanguage}"}

            if not src_run.get("passed", False):
                diag = src_run.get("error") or "Source code threw an exception or failed test contract"
                for o in src_run.get("testOutcomes", []):
                    if not o.passed and o.errorMessage:
                        diag = f"Test #{o.testIndex} failed on source: {o.errorMessage}"
                        break
                gates.append(GateResult(
                    gate="source_baseline",
                    passed=False,
                    status="SOURCE_BASELINE_FAILED",
                    message="Source code baseline execution failed",
                    diagnostics=diag
                ))
                return ValidationResponse(
                    overallStatus="SOURCE_BASELINE_FAILED",
                    passed=False,
                    gates=gates,
                    testResults=[],
                    passedTestsCount=0,
                    totalTestsCount=len(req.tests),
                    runtimeDiagnostics=diag,
                    failureCategory="SOURCE_BASELINE_ERROR",
                    sandboxStatus=sandbox_status
                )

            # Store baseline outputs for differential comparison
            for outcome in src_run.get("testOutcomes", []):
                source_oracle_outputs[outcome.testIndex] = outcome.actualOutput

            gates.append(GateResult(
                gate="source_baseline",
                passed=True,
                status="PASSED",
                message="Source baseline passed test suite"
            ))

        # ----------------------------------------------------
        # Gate 3 & 5: Target Compilation & Execution
        # ----------------------------------------------------
        if req.targetLanguage == "java":
            tgt_run = self.java_runner.compile_and_run(candidate, req.entryPoint, req.tests)
            
            # Record compilation gate
            if "compileGate" in tgt_run:
                gates.append(tgt_run["compileGate"])
                if not tgt_run["compileGate"].passed:
                    return ValidationResponse(
                        overallStatus="COMPILE_FAILED",
                        passed=False,
                        gates=gates,
                        testResults=[],
                        passedTestsCount=0,
                        totalTestsCount=len(req.tests),
                        compilerDiagnostics=tgt_run.get("compilerDiagnostics"),
                        failureCategory="COMPILATION_ERROR",
                        sandboxStatus=sandbox_status
                    )

            if "execGate" in tgt_run:
                gates.append(tgt_run["execGate"])
                if not tgt_run["execGate"].passed:
                    return ValidationResponse(
                        overallStatus=tgt_run["execGate"].status,
                        passed=False,
                        gates=gates,
                        testResults=[],
                        passedTestsCount=0,
                        totalTestsCount=len(req.tests),
                        runtimeDiagnostics=tgt_run.get("runtimeDiagnostics"),
                        failureCategory="RUNTIME_EXCEPTION",
                        sandboxStatus=sandbox_status
                    )

            raw_outcomes = tgt_run.get("testOutcomes", [])

        elif req.targetLanguage == "python":
            tgt_run = self.py_runner.execute_tests(candidate, req.entryPoint, req.tests)
            if "gate" in tgt_run:
                gates.append(tgt_run["gate"])
                if not tgt_run["gate"].passed:
                    return ValidationResponse(
                        overallStatus=tgt_run["gate"].status,
                        passed=False,
                        gates=gates,
                        testResults=[],
                        passedTestsCount=0,
                        totalTestsCount=len(req.tests),
                        runtimeDiagnostics=tgt_run.get("error"),
                        failureCategory="RUNTIME_EXCEPTION" if tgt_run["gate"].status != "SYNTAX_FAILED" else "SYNTAX_ERROR",
                        sandboxStatus=sandbox_status
                    )
            raw_outcomes = tgt_run.get("testOutcomes", [])
        else:
            return ValidationResponse(
                overallStatus="UNSUPPORTED",
                passed=False,
                gates=gates,
                testResults=[],
                passedTestsCount=0,
                totalTestsCount=len(req.tests),
                failureCategory="UNSUPPORTED_LANGUAGE",
                sandboxStatus=sandbox_status
            )

        # ----------------------------------------------------
        # Gate 6: Differential Output Verification
        # ----------------------------------------------------
        passed_count = 0
        all_passed = True

        for idx, t_case in enumerate(req.tests):
            matched = next((o for o in raw_outcomes if o.testIndex == idx), None)
            if not matched:
                test_results.append(TestOutcome(
                    testIndex=idx,
                    input=t_case.input,
                    expectedOutput=t_case.expectedOutput,
                    actualOutput=None,
                    passed=False,
                    outcome="NOT_RUN",
                    errorMessage="Output missing"
                ))
                all_passed = False
                continue

            if not matched.passed:
                test_results.append(matched)
                all_passed = False
                continue

            expected = t_case.expectedOutput
            if expected is None and idx in source_oracle_outputs:
                expected = source_oracle_outputs[idx]

            actual = matched.actualOutput
            is_match = self._outputs_equal(expected, actual)

            outcome_val = "PASSED" if is_match else "FAILED"
            if is_match:
                passed_count += 1
            else:
                all_passed = False

            test_results.append(TestOutcome(
                testIndex=idx,
                input=t_case.input,
                expectedOutput=expected,
                actualOutput=actual,
                passed=is_match,
                outcome=outcome_val,
                executionTimeMs=matched.executionTimeMs,
                errorMessage=None if is_match else f"Output mismatch: expected {expected}, got {actual}"
            ))

        behavioral_gate = GateResult(
            gate="behavioral",
            passed=all_passed,
            status="PASSED" if all_passed else "FAILED_BEHAVIORAL_TESTS",
            message=f"{passed_count}/{len(req.tests)} tests passed behavioral check"
        )
        gates.append(behavioral_gate)

        if all_passed:
            overall_status = "PASSED_AVAILABLE_TESTS"
            fail_category = None
        elif passed_count > 0:
            overall_status = "PARTIAL_EVIDENCE"
            fail_category = "OUTPUT_MISMATCH"
        else:
            overall_status = "FAILED_BEHAVIORAL_TESTS"
            fail_category = "OUTPUT_MISMATCH"

        return ValidationResponse(
            overallStatus=overall_status,
            passed=all_passed,
            gates=gates,
            testResults=test_results,
            passedTestsCount=passed_count,
            totalTestsCount=len(req.tests),
            compilerDiagnostics=compiler_diag,
            runtimeDiagnostics=runtime_diag,
            failureCategory=fail_category,
            sandboxStatus=sandbox_status
        )
