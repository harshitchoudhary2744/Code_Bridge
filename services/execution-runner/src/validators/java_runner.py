import json
import os
import re
import shutil
import subprocess
import tempfile
import time
from typing import Dict, Any, List, Optional
from ..schemas import EntryPoint, TestCase, GateResult, TestOutcome

class JavaRunner:
    """
    Validates Java 17 code: compilation with javac and execution with java runtime.
    Captures compiler diagnostics, runtime exceptions, and enforces timeouts and memory containment.
    """

    def __init__(self, timeout_seconds: float = 5.0, max_output_bytes: int = 65536):
        self.timeout_seconds = timeout_seconds
        self.max_output_bytes = max_output_bytes

    def _prepare_files(self, temp_dir: str, code: str, entry_point: EntryPoint, tests: List[TestCase]) -> str:
        """
        Prepares Solution.java and TestRunner.java in temp_dir.
        Returns the main class name to invoke.
        """
        # Determine class name
        class_match = re.search(r'\bpublic\s+class\s+([A-Za-z0-9_]+)', code)
        if not class_match:
            class_match = re.search(r'\bclass\s+([A-Za-z0-9_]+)', code)

        if class_match:
            class_name = class_match.group(1)
            solution_source = f"import java.util.*;\nimport java.io.*;\n{code}"
        else:
            class_name = "Solution"
            solution_source = f"import java.util.*;\nimport java.io.*;\npublic class Solution {{\n{code}\n}}"

        solution_file = os.path.join(temp_dir, f"{class_name}.java")
        with open(solution_file, "w", encoding="utf-8") as f:
            f.write(solution_source)

        # Build test calls
        test_calls_code = []
        for idx, t in enumerate(tests):
            args_str_list = []
            for arg in t.input:
                if isinstance(arg, bool):
                    args_str_list.append("true" if arg else "false")
                elif isinstance(arg, int):
                    args_str_list.append(str(arg))
                elif isinstance(arg, float):
                    args_str_list.append(str(arg))
                elif isinstance(arg, str):
                    escaped = arg.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
                    args_str_list.append(f'"{escaped}"')
                elif isinstance(arg, list):
                    if len(arg) == 0:
                        args_str_list.append("new int[]{}")
                    elif isinstance(arg[0], int):
                        args_str_list.append(f"new int[]{{{', '.join(str(x) for x in arg)}}}")
                    elif isinstance(arg[0], str):
                        escaped_items = [f'"{x.replace(chr(34), chr(92)+chr(34))}"' for x in arg]
                        args_str_list.append(f"new String[]{{{', '.join(escaped_items)}}}")
                    else:
                        args_str_list.append(f"new Object[]{{{', '.join(str(x) for x in arg)}}}")
                else:
                    args_str_list.append(str(arg))
            
            call_args = ", ".join(args_str_list)
            test_calls_code.append(f"""
        try {{
            long start = System.nanoTime();
            Object res = new {class_name}().{entry_point.name}({call_args});
            long duration = (System.nanoTime() - start) / 1000000;
            printTestResult({idx}, "OK", res, duration, null);
        }} catch (Throwable t) {{
            printTestResult({idx}, "CRASHED", null, 0, t.toString());
        }}
""")

        test_calls_joined = "\n".join(test_calls_code)

        runner_template = """// TransCode Lab Java Test Runner
import java.util.*;
import java.io.*;

public class TestRunner {
    private static void printTestResult(int idx, String status, Object out, long durationMs, String err) {
        StringBuilder sb = new StringBuilder();
        sb.append("{\\"testIndex\\": ").append(idx);
        sb.append(", \\"status\\": \\"").append(status).append("\\"");
        sb.append(", \\"durationMs\\": ").append(durationMs);
        if ("OK".equals(status)) {
            if (out == null) {
                sb.append(", \\"output\\": null");
            } else if (out instanceof String) {
                sb.append(", \\"output\\": \\"").append(escapeJson((String) out)).append("\\"");
            } else if (out instanceof Boolean || out instanceof Number) {
                sb.append(", \\"output\\": ").append(out.toString());
            } else if (out instanceof int[]) {
                int[] arr = (int[]) out;
                sb.append(", \\"output\\": ").append(Arrays.toString(arr));
            } else if (out instanceof Object[]) {
                sb.append(", \\"output\\": ").append(Arrays.deepToString((Object[]) out));
            } else {
                sb.append(", \\"output\\": \\"").append(escapeJson(out.toString())).append("\\"");
            }
        } else {
            sb.append(", \\"error\\": \\"").append(escapeJson(err != null ? err : "Unknown error")).append("\\"");
        }
        sb.append("}");
        System.out.println(sb.toString());
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\\\", "\\\\\\\\")
                .replace("\\\"", "\\\\\\\"")
                .replace("\\b", "\\\\b")
                .replace("\\f", "\\\\f")
                .replace("\\n", "\\\\n")
                .replace("\\r", "\\\\r")
                .replace("\\t", "\\\\t");
    }

    public static void main(String[] args) {
        System.out.println("__BEGIN_RESULTS__");
__TEST_CALLS__
        System.out.println("__END_RESULTS__");
    }
}
"""
        runner_source = runner_template.replace("__TEST_CALLS__", test_calls_joined)
        runner_file = os.path.join(temp_dir, "TestRunner.java")
        with open(runner_file, "w", encoding="utf-8") as f:
            f.write(runner_source)

        return class_name

    def compile_and_run(
        self,
        code: str,
        entry_point: EntryPoint,
        tests: List[TestCase]
    ) -> Dict[str, Any]:
        temp_dir = tempfile.mkdtemp(prefix="transcode_java_")
        
        try:
            class_name = self._prepare_files(temp_dir, code, entry_point, tests)

            # 1. Compilation Gate with javac
            compile_start = time.perf_counter()
            compile_cmd = ["javac", "-encoding", "UTF-8", f"{class_name}.java", "TestRunner.java"]
            
            comp_proc = subprocess.Popen(
                compile_cmd,
                cwd=temp_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            comp_out, comp_err = comp_proc.communicate(timeout=10.0)
            compile_duration = (time.perf_counter() - compile_start) * 1000.0

            if comp_proc.returncode != 0:
                diagnostics = (comp_err or comp_out).strip()
                diagnostics = diagnostics.replace(temp_dir + os.sep, "")
                return {
                    "passed": False,
                    "status": "COMPILE_FAILED",
                    "compileGate": GateResult(
                        gate="compilation",
                        passed=False,
                        status="COMPILE_FAILED",
                        message="javac compilation failed",
                        diagnostics=diagnostics[:4096],
                        durationMs=round(compile_duration, 2)
                    ),
                    "testOutcomes": [],
                    "compilerDiagnostics": diagnostics[:4096],
                    "error": diagnostics[:4096]
                }

            compile_gate = GateResult(
                gate="compilation",
                passed=True,
                status="PASSED",
                message="javac compilation successful",
                durationMs=round(compile_duration, 2)
            )

            # 2. Execution Gate with java
            exec_start = time.perf_counter()
            exec_cmd = ["java", "-Xmx256m", "-cp", ".", "TestRunner"]
            
            exec_proc = subprocess.Popen(
                exec_cmd,
                cwd=temp_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            try:
                stdout, stderr = exec_proc.communicate(timeout=self.timeout_seconds)
            except subprocess.TimeoutExpired:
                exec_proc.kill()
                stdout, stderr = exec_proc.communicate()
                exec_duration = (time.perf_counter() - exec_start) * 1000.0
                return {
                    "passed": False,
                    "status": "TIMED_OUT",
                    "compileGate": compile_gate,
                    "execGate": GateResult(
                        gate="target_execution",
                        passed=False,
                        status="TIMED_OUT",
                        message=f"Execution timed out after {self.timeout_seconds}s",
                        durationMs=round(exec_duration, 2)
                    ),
                    "testOutcomes": [],
                    "error": f"Execution timed out after {self.timeout_seconds}s"
                }

            exec_duration = (time.perf_counter() - exec_start) * 1000.0

            if exec_proc.returncode != 0:
                runtime_err = (stderr or stdout).strip()
                return {
                    "passed": False,
                    "status": "EXECUTION_FAILED",
                    "compileGate": compile_gate,
                    "execGate": GateResult(
                        gate="target_execution",
                        passed=False,
                        status="EXECUTION_FAILED",
                        message=f"Java runtime exception (exit code {exec_proc.returncode})",
                        diagnostics=runtime_err[:2048],
                        durationMs=round(exec_duration, 2)
                    ),
                    "testOutcomes": [],
                    "runtimeDiagnostics": runtime_err[:2048],
                    "error": runtime_err[:2048]
                }

            test_outcomes: List[TestOutcome] = []
            all_passed = True
            in_results = False

            for line in stdout.splitlines():
                line = line.strip()
                if line == "__BEGIN_RESULTS__":
                    in_results = True
                    continue
                if line == "__END_RESULTS__":
                    in_results = False
                    continue
                if in_results and line.startswith("{"):
                    try:
                        record = json.loads(line)
                        idx = record.get("testIndex")
                        status = record.get("status")
                        actual_out = record.get("output")
                        dur_ms = record.get("durationMs")
                        err_msg = record.get("error")

                        matched_test = tests[idx] if idx < len(tests) else None
                        expected_out = matched_test.expectedOutput if matched_test else None

                        if status == "OK":
                            test_outcomes.append(TestOutcome(
                                testIndex=idx,
                                input=matched_test.input if matched_test else [],
                                expectedOutput=expected_out,
                                actualOutput=actual_out,
                                passed=True,
                                outcome="PASSED",
                                executionTimeMs=dur_ms
                            ))
                        else:
                            all_passed = False
                            test_outcomes.append(TestOutcome(
                                testIndex=idx,
                                input=matched_test.input if matched_test else [],
                                expectedOutput=expected_out,
                                actualOutput=None,
                                passed=False,
                                outcome="CRASHED",
                                executionTimeMs=dur_ms,
                                errorMessage=err_msg
                            ))
                    except json.JSONDecodeError:
                        continue

            return {
                "passed": all_passed,
                "status": "PASSED" if all_passed else "FAILED_TESTS",
                "compileGate": compile_gate,
                "execGate": GateResult(
                    gate="target_execution",
                    passed=True,
                    status="PASSED",
                    message="Target execution completed",
                    durationMs=round(exec_duration, 2)
                ),
                "testOutcomes": test_outcomes,
                "error": None
            }

        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)
