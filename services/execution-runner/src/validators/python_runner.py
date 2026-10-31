import ast
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from typing import Dict, Any, List, Optional
from ..schemas import EntryPoint, TestCase, GateResult, TestOutcome
from .harness import build_python_harness

class PythonRunner:
    """
    Validates Python 3.11 code: syntax checking with ast.parse,
    execution within restricted subprocess, and timeout / resource containment.
    """

    def __init__(self, timeout_seconds: float = 5.0, max_output_bytes: int = 65536):
        self.timeout_seconds = timeout_seconds
        self.max_output_bytes = max_output_bytes

    def check_syntax(self, code: str) -> GateResult:
        start = time.perf_counter()
        try:
            ast.parse(code)
            duration = (time.perf_counter() - start) * 1000.0
            return GateResult(
                gate="syntax",
                passed=True,
                status="PASSED",
                message="Valid Python 3 syntax",
                durationMs=round(duration, 2)
            )
        except SyntaxError as e:
            duration = (time.perf_counter() - start) * 1000.0
            diag = f"SyntaxError at line {e.lineno}, offset {e.offset}: {e.msg}\n  {e.text or ''}"
            return GateResult(
                gate="syntax",
                passed=False,
                status="SYNTAX_FAILED",
                message=f"SyntaxError: {e.msg} (line {e.lineno})",
                diagnostics=diag.strip(),
                durationMs=round(duration, 2)
            )

    def execute_tests(
        self,
        code: str,
        entry_point: EntryPoint,
        tests: List[TestCase]
    ) -> Dict[str, Any]:
        """
        Executes code against tests in an isolated temporary directory.
        """
        syntax_res = self.check_syntax(code)
        if not syntax_res.passed:
            return {
                "passed": False,
                "status": "SYNTAX_FAILED",
                "gate": syntax_res,
                "testOutcomes": [],
                "error": syntax_res.message,
                "diagnostics": syntax_res.diagnostics
            }

        temp_dir = tempfile.mkdtemp(prefix="transcode_py_")
        harness_script = build_python_harness(code, entry_point, tests)
        script_path = os.path.join(temp_dir, "harness.py")

        with open(script_path, "w", encoding="utf-8") as f:
            f.write(harness_script)

        start_time = time.perf_counter()
        test_outcomes: List[TestOutcome] = []

        try:
            cmd = [sys.executable, "-B", "-u", "harness.py"]
            proc = subprocess.Popen(
                cmd,
                cwd=temp_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            try:
                stdout, stderr = proc.communicate(timeout=self.timeout_seconds)
            except subprocess.TimeoutExpired:
                proc.kill()
                stdout, stderr = proc.communicate()
                duration = (time.perf_counter() - start_time) * 1000.0
                return {
                    "passed": False,
                    "status": "TIMED_OUT",
                    "gate": GateResult(
                        gate="target_execution",
                        passed=False,
                        status="TIMED_OUT",
                        message=f"Execution timed out after {self.timeout_seconds}s",
                        durationMs=round(duration, 2)
                    ),
                    "testOutcomes": [],
                    "error": f"Execution timed out after {self.timeout_seconds} seconds"
                }

            duration = (time.perf_counter() - start_time) * 1000.0

            if proc.returncode != 0:
                diag = stderr.strip() if stderr else stdout.strip()
                return {
                    "passed": False,
                    "status": "EXECUTION_FAILED",
                    "gate": GateResult(
                        gate="target_execution",
                        passed=False,
                        status="EXECUTION_FAILED",
                        message=f"Process exited with code {proc.returncode}",
                        diagnostics=diag[:2048],
                        durationMs=round(duration, 2)
                    ),
                    "testOutcomes": [],
                    "error": diag[:2048]
                }

            # Parse harness JSON output
            output_data = {}
            for line in stdout.splitlines():
                line = line.strip()
                if line.startswith('{"results":') or line.startswith('{"error":'):
                    try:
                        output_data = json.loads(line)
                        break
                    except json.JSONDecodeError:
                        continue

            if "error" in output_data:
                err_msg = output_data.get("message", "Harness execution error")
                return {
                    "passed": False,
                    "status": "EXECUTION_FAILED",
                    "gate": GateResult(
                        gate="target_execution",
                        passed=False,
                        status="EXECUTION_FAILED",
                        message=err_msg,
                        diagnostics=err_msg,
                        durationMs=round(duration, 2)
                    ),
                    "testOutcomes": [],
                    "error": err_msg
                }

            raw_results = output_data.get("results", [])
            all_passed = True

            for idx, test_case in enumerate(tests):
                raw_match = next((r for r in raw_results if r.get("testIndex") == idx), None)
                if not raw_match:
                    test_outcomes.append(TestOutcome(
                        testIndex=idx,
                        input=test_case.input,
                        expectedOutput=test_case.expectedOutput,
                        actualOutput=None,
                        passed=False,
                        outcome="NOT_RUN",
                        errorMessage="Test output missing from harness"
                    ))
                    all_passed = False
                    continue

                status = raw_match.get("status")
                actual_val = raw_match.get("output")
                time_ms = raw_match.get("timeMs")

                if status == "OK":
                    test_outcomes.append(TestOutcome(
                        testIndex=idx,
                        input=test_case.input,
                        expectedOutput=test_case.expectedOutput,
                        actualOutput=actual_val,
                        passed=True,
                        outcome="PASSED",
                        executionTimeMs=time_ms
                    ))
                else:
                    err = raw_match.get("error", "Runtime error")
                    test_outcomes.append(TestOutcome(
                        testIndex=idx,
                        input=test_case.input,
                        expectedOutput=test_case.expectedOutput,
                        actualOutput=None,
                        passed=False,
                        outcome="CRASHED",
                        executionTimeMs=time_ms,
                        errorMessage=err
                    ))
                    all_passed = False

            return {
                "passed": all_passed,
                "status": "PASSED" if all_passed else "FAILED_TESTS",
                "gate": GateResult(
                    gate="target_execution",
                    passed=True,
                    status="PASSED",
                    message="Target execution completed",
                    durationMs=round(duration, 2)
                ),
                "testOutcomes": test_outcomes,
                "error": None
            }

        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

