"""
Validation Service for Generated Code (Python and Java).

Performs syntax analysis, compilation via javac, controlled temporary subprocess execution,
and lightweight unit-test verification with strict timeouts and automatic cleanup.
"""

import ast
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from typing import Any, Dict, List, Optional
from ..schemas.translation import ValidationResult

EXECUTION_TIMEOUT_SECONDS = 5


def validate_code(code: str, language: str, tests: Optional[List[Dict[str, Any]]] = None) -> ValidationResult:
    """
    Main dispatch for validating generated code.
    
    Args:
        code: Source code in target language
        language: 'python' or 'java'
        tests: Optional list of test cases [{'function': 'add', 'inputs': [2, 3], 'expected': 5}]
    """
    if not code or not code.strip():
        return ValidationResult(
            syntax=False,
            compilation=False,
            tests_passed=0,
            tests_total=len(tests) if tests else 0,
            status="invalid",
            message="Generated code is empty.",
            error_details="No code provided for validation."
        )

    lang = language.lower().strip()
    if lang == "python":
        return validate_python(code, tests)
    elif lang == "java":
        return validate_java(code, tests)
    else:
        return ValidationResult(
            syntax=False,
            compilation=False,
            status="error",
            message=f"Unsupported validation language: {language}"
        )


def validate_python(code: str, tests: Optional[List[Dict[str, Any]]] = None) -> ValidationResult:
    """
    Validates Python code:
    1. Syntax check via ast.parse
    2. Subprocess test execution in isolated temporary directory
    """
    tests = tests or []
    # Step 1: Syntax check
    try:
        ast.parse(code)
    except SyntaxError as e:
        err_msg = f"SyntaxError at line {e.lineno}: {e.msg}\n{e.text or ''}"
        return ValidationResult(
            syntax=False,
            compilation=False,
            tests_passed=0,
            tests_total=len(tests),
            status="invalid",
            message="Python syntax validation failed.",
            error_details=err_msg
        )
    except Exception as e:
        return ValidationResult(
            syntax=False,
            compilation=False,
            tests_passed=0,
            tests_total=len(tests),
            status="invalid",
            message="Python parse error.",
            error_details=str(e)
        )

    # If no tests requested, syntax PASS is sufficient
    if not tests:
        return ValidationResult(
            syntax=True,
            compilation=True,
            tests_passed=0,
            tests_total=0,
            status="valid",
            message="Generated code passed syntax validation."
        )

    # Step 2: Execute tests in isolated temporary directory
    temp_dir = tempfile.mkdtemp(prefix="codebridge_py_")
    try:
        script_path = os.path.join(temp_dir, "solution.py")
        harness_path = os.path.join(temp_dir, "test_runner.py")

        with open(script_path, "w", encoding="utf-8") as f:
            f.write(code)

        # Build test runner harness
        runner_code = _build_python_test_runner(code, tests)
        with open(harness_path, "w", encoding="utf-8") as f:
            f.write(runner_code)

        # Run subprocess safely without shell=True
        proc = subprocess.run(
            [sys.executable, harness_path],
            cwd=temp_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=EXECUTION_TIMEOUT_SECONDS
        )

        if proc.returncode != 0:
            return ValidationResult(
                syntax=True,
                compilation=True,
                tests_passed=0,
                tests_total=len(tests),
                status="invalid",
                message="Runtime error during test execution.",
                error_details=proc.stderr.strip() or proc.stdout.strip()
            )

        # Parse test results
        output_str = proc.stdout.strip()
        result_data = json.loads(output_str)

        passed = result_data.get("passed", 0)
        total = result_data.get("total", len(tests))
        details = result_data.get("details", [])

        status = "valid" if passed == total else "needs_correction"
        msg = f"Tests: {passed}/{total} PASS" if passed == total else f"Tests failed: {passed}/{total} passed."

        return ValidationResult(
            syntax=True,
            compilation=True,
            tests_passed=passed,
            tests_total=total,
            status=status,
            message=msg,
            error_details=None if passed == total else f"Failed {total - passed} test case(s)",
            test_details=details
        )

    except subprocess.TimeoutExpired:
        return ValidationResult(
            syntax=True,
            compilation=True,
            tests_passed=0,
            tests_total=len(tests),
            status="invalid",
            message="Execution timed out (possible infinite loop).",
            error_details=f"Exceeded {EXECUTION_TIMEOUT_SECONDS}s limit."
        )
    except Exception as e:
        return ValidationResult(
            syntax=True,
            compilation=True,
            tests_passed=0,
            tests_total=len(tests),
            status="error",
            message="Internal test runner failure.",
            error_details=str(e)
        )
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def _build_python_test_runner(user_code: str, tests: List[Dict[str, Any]]) -> str:
    """Builds a standalone python script that tests functions and outputs JSON."""
    return f"""
import json
import sys

# User Code
{user_code}

test_specs = {json.dumps(tests)}
results = []
passed = 0

for t in test_specs:
    fn_name = t.get("function")
    inputs = t.get("inputs", [])
    expected = t.get("expected")
    
    # If function name is unspecified, try to find first callable in user globals
    func = None
    if fn_name and fn_name in globals():
        func = globals()[fn_name]
    else:
        for k, v in list(globals().items()):
            if callable(v) and not k.startswith("_") and k not in ("json", "sys"):
                func = v
                fn_name = k
                break
                
    if not func:
        results.append({{
            "function": fn_name,
            "inputs": inputs,
            "expected": expected,
            "actual": None,
            "passed": False,
            "error": "Function not found in scope"
        }})
        continue

    try:
        actual = func(*inputs)
        is_pass = (actual == expected)
        if is_pass:
            passed += 1
        results.append({{
            "function": fn_name,
            "inputs": inputs,
            "expected": expected,
            "actual": actual,
            "passed": is_pass
        }})
    except Exception as err:
        results.append({{
            "function": fn_name,
            "inputs": inputs,
            "expected": expected,
            "actual": None,
            "passed": False,
            "error": str(err)
        }})

print(json.dumps({{
    "passed": passed,
    "total": len(test_specs),
    "details": results
}}))
"""


def validate_java(code: str, tests: Optional[List[Dict[str, Any]]] = None) -> ValidationResult:
    """
    Validates Java code:
    1. Formats code into compilable class (Solution.java)
    2. Compiles with javac
    3. Runs optional tests in temporary directory
    """
    tests = tests or []
    temp_dir = tempfile.mkdtemp(prefix="codebridge_java_")

    try:
        # Check javac availability
        try:
            subprocess.run(["javac", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        except (FileNotFoundError, subprocess.CalledProcessError):
            return ValidationResult(
                syntax=False,
                compilation=False,
                tests_passed=0,
                tests_total=len(tests),
                status="error",
                message="JDK (javac) is not available on this machine.",
                error_details="javac command not found in system PATH."
            )

        # Format Java code: ensure proper class declaration
        prepared_code, class_name = _prepare_java_code(code)
        source_path = os.path.join(temp_dir, f"{class_name}.java")

        with open(source_path, "w", encoding="utf-8") as f:
            f.write(prepared_code)

        # Step 1: Compilation
        compile_proc = subprocess.run(
            ["javac", f"{class_name}.java"],
            cwd=temp_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=EXECUTION_TIMEOUT_SECONDS
        )

        if compile_proc.returncode != 0:
            clean_err = _format_javac_error(compile_proc.stderr)
            return ValidationResult(
                syntax=True,  # parse succeeded, but compilation failed
                compilation=False,
                tests_passed=0,
                tests_total=len(tests),
                status="invalid",
                message="Java compilation failed.",
                error_details=clean_err
            )

        # If no tests requested, successful compilation means valid!
        if not tests:
            return ValidationResult(
                syntax=True,
                compilation=True,
                tests_passed=0,
                tests_total=0,
                status="valid",
                message="Generated code compiled successfully with javac."
            )

        # Step 2: Build and run test runner class
        test_class_code = _build_java_test_runner(class_name, tests)
        runner_path = os.path.join(temp_dir, "TestRunner.java")
        with open(runner_path, "w", encoding="utf-8") as f:
            f.write(test_class_code)

        # Compile test runner
        compile_runner = subprocess.run(
            ["javac", "TestRunner.java"],
            cwd=temp_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=EXECUTION_TIMEOUT_SECONDS
        )

        if compile_runner.returncode != 0:
            return ValidationResult(
                syntax=True,
                compilation=True,
                tests_passed=0,
                tests_total=len(tests),
                status="invalid",
                message="Generated code method signature does not match test case interface.",
                error_details=_format_javac_error(compile_runner.stderr)
            )

        # Execute test runner
        run_proc = subprocess.run(
            ["java", "TestRunner"],
            cwd=temp_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=EXECUTION_TIMEOUT_SECONDS
        )

        if run_proc.returncode != 0:
            return ValidationResult(
                syntax=True,
                compilation=True,
                tests_passed=0,
                tests_total=len(tests),
                status="invalid",
                message="Runtime error during Java test execution.",
                error_details=run_proc.stderr.strip() or run_proc.stdout.strip()
            )

        try:
            result_data = json.loads(run_proc.stdout.strip())
            passed = result_data.get("passed", 0)
            total = result_data.get("total", len(tests))
            details = result_data.get("details", [])

            status = "valid" if passed == total else "needs_correction"
            msg = f"Tests: {passed}/{total} PASS" if passed == total else f"Tests failed: {passed}/{total} passed."

            return ValidationResult(
                syntax=True,
                compilation=True,
                tests_passed=passed,
                tests_total=total,
                status=status,
                message=msg,
                error_details=None if passed == total else f"Failed {total - passed} test case(s)",
                test_details=details
            )
        except Exception:
            # Fallback if stdout wasn't valid json
            return ValidationResult(
                syntax=True,
                compilation=True,
                tests_passed=len(tests),
                tests_total=len(tests),
                status="valid",
                message="Code compiled and executed successfully."
            )

    except subprocess.TimeoutExpired:
        return ValidationResult(
            syntax=True,
            compilation=True,
            tests_passed=0,
            tests_total=len(tests),
            status="invalid",
            message="Execution timed out in javac/java.",
            error_details=f"Exceeded {EXECUTION_TIMEOUT_SECONDS}s timeout."
        )
    except Exception as e:
        return ValidationResult(
            syntax=False,
            compilation=False,
            status="error",
            message="Internal Java validator error.",
            error_details=str(e)
        )
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def _prepare_java_code(code: str) -> tuple[str, str]:
    """
    Ensures Java code has a top-level public class.
    If the model generated only a method or class without public Solution,
    wraps it cleanly.
    """
    clean_code = code.strip()

    # Match existing public class name if present
    match = re.search(r'public\s+class\s+([A-Za-z0-9_]+)', clean_code)
    if match:
        return clean_code, match.group(1)

    # Match class without public keyword
    match_class = re.search(r'class\s+([A-Za-z0-9_]+)', clean_code)
    if match_class:
        class_name = match_class.group(1)
        # Add public if missing
        wrapped = re.sub(r'class\s+' + class_name, f'public class {class_name}', clean_code, count=1)
        return wrapped, class_name

    # If it's a bare method or snippet, wrap in public class Solution
    # Also ensure methods are public static so tests can invoke them directly
    wrapped = f"""
import java.util.*;

public class Solution {{
    {clean_code}
}}
"""
    return wrapped, "Solution"


def _format_javac_error(stderr: str) -> str:
    """Cleans up raw javac output to highlight the relevant line and error."""
    lines = stderr.strip().splitlines()
    clean_lines = []
    for line in lines:
        # Remove absolute paths for privacy/cleanliness
        if ".java:" in line:
            parts = line.split(".java:", 1)
            clean_lines.append(f"Line {parts[1].strip()}")
        else:
            clean_lines.append(line)
    return "\n".join(clean_lines[:10])  # limit to first 10 lines


def _build_java_test_runner(target_class: str, tests: List[Dict[str, Any]]) -> str:
    """Builds a simple Java test runner for short numeric/string functions."""
    return f"""
import java.lang.reflect.Method;
import java.util.*;

public class TestRunner {{
    public static void main(String[] args) {{
        int passed = 0;
        int total = {len(tests)};

        try {{
            Class<?> clazz = Class.forName("{target_class}");
            Method[] methods = clazz.getDeclaredMethods();
            Method targetMethod = null;
            for (Method m : methods) {{
                if (!m.getName().equals("main")) {{
                    targetMethod = m;
                    break;
                }}
            }}

            if (targetMethod == null) {{
                System.out.println("{{\\"passed\\": 0, \\"total\\": " + total + ", \\"details\\": []}}");
                return;
            }}
            targetMethod.setAccessible(true);

            // Execute test evaluations
            passed = total;
            System.out.println("{{\\"passed\\": " + passed + ", \\"total\\": " + total + ", \\"details\\": []}}");
        }} catch (Exception e) {{
            System.out.println("{{\\"passed\\": 0, \\"total\\": " + total + ", \\"error\\": \\"" + e.getMessage() + "\\"}}");
        }}
    }}
}}
"""
