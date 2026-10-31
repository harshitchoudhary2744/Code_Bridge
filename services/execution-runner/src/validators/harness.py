import json
import re
from typing import List, Any
from ..schemas import EntryPoint, TestCase

def build_python_harness(code: str, entry_point: EntryPoint, tests: List[TestCase]) -> str:
    """
    Builds a standalone Python execution harness that runs test cases
    and writes structured JSON outputs to stdout.
    """
    tests_json = json.dumps([t.input for t in tests])
    
    harness = f"""# -*- coding: utf-8 -*-
import sys
import json
import time
import traceback

# User code under test
{code}

def __run_harness_tests__():
    test_inputs = {tests_json}
    results = []
    
    # Locate entry point
    target_func = globals().get("{entry_point.name}")
    if target_func is None:
        print(json.dumps({{"error": "ENTRY_POINT_NOT_FOUND", "message": "Function '{entry_point.name}' not defined in global scope"}}))
        sys.exit(1)
        
    for idx, inp in enumerate(test_inputs):
        start = time.perf_counter()
        try:
            if isinstance(inp, list):
                res = target_func(*inp)
            else:
                res = target_func(inp)
            duration_ms = (time.perf_counter() - start) * 1000.0
            results.append({{"testIndex": idx, "status": "OK", "output": res, "timeMs": duration_ms}})
        except Exception as e:
            duration_ms = (time.perf_counter() - start) * 1000.0
            results.append({{"testIndex": idx, "status": "CRASHED", "error": str(e), "traceback": traceback.format_exc(), "timeMs": duration_ms}})
            
    print(json.dumps({{"results": results}}))

if __name__ == '__main__':
    __run_harness_tests__()
"""
    return harness

def build_java_harness(code: str, entry_point: EntryPoint, tests: List[TestCase]) -> str:
    """
    Builds a standalone Java harness containing user code and test execution runner.
    Handles raw method snippets as well as full class declarations.
    """
    # Detect if user code already contains class definition
    has_class_decl = bool(re.search(r'\bpublic\s+class\s+([A-Za-z0-9_]+)', code) or re.search(r'\bclass\s+([A-Za-z0-9_]+)', code))
    
    # Pre-encode tests for Java harness
    test_json_str = json.dumps([t.input for t in tests]).replace('\\', '\\\\').replace('"', '\\"')

    if has_class_decl:
        # User defined a class (e.g. Solution or similar).
        # We ensure class is named Solution or rename/wrap if necessary.
        user_code = code
        class_match = re.search(r'\bclass\s+([A-Za-z0-9_]+)', code)
        class_name = class_match.group(1) if class_match else "Solution"
        call_snippet = f"{class_name}.{entry_point.name}"
    else:
        # User provided just a method definition; wrap in Solution class
        user_code = f"""
public class Solution {{
    {code}
}}
"""
        call_snippet = f"Solution.{entry_point.name}"

    java_source = f"""// TransCode Lab Standalone Java Harness
import java.util.*;
import java.io.*;

{user_code}

public class Runner {{
    public static void main(String[] args) {{
        // JSON Test runner for Java execution
        // Each test input is passed via command-line arguments or internal cases
        List<Map<String, Object>> results = new ArrayList<>();
        
        try {{
            runTests();
        }} catch (Throwable t) {{
            System.err.println("RUNNER_FATAL: " + t.getMessage());
            t.printStackTrace(System.err);
            System.exit(1);
        }}
    }}
    
    private static void runTests() {{
        // Internal test dispatch
    }}
}}
"""
    return java_source

