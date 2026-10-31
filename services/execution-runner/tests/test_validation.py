import pytest
from src.schemas import ValidationRequest, EntryPoint, TestCase
from src.validators.differential import DifferentialEvaluator

def test_python_syntax_failure():
    evaluator = DifferentialEvaluator()
    req = ValidationRequest(
        sourceLanguage="java",
        targetLanguage="python",
        sourceCode="public class Solution { public static int add(int a, int b) { return a + b; } }",
        candidateCode="def add(a, b:\n    return a + b",  # Missing closing paren
        entryPoint=EntryPoint(name="add"),
        tests=[TestCase(input=[1, 2], expectedOutput=3)]
    )
    res = evaluator.evaluate(req)
    assert res.overallStatus == "SYNTAX_FAILED"
    assert not res.passed
    assert res.failureCategory == "SYNTAX_ERROR"
    assert res.runtimeDiagnostics is not None

def test_java_compilation_failure():
    evaluator = DifferentialEvaluator()
    req = ValidationRequest(
        sourceLanguage="python",
        targetLanguage="java",
        sourceCode="def add(a: int, b: int) -> int:\n    return a + b\n",
        candidateCode="public class Solution { public static int add(int a, int b) { return a + c; } }",  # Undefined variable 'c'
        entryPoint=EntryPoint(name="add"),
        tests=[TestCase(input=[1, 2], expectedOutput=3)]
    )
    res = evaluator.evaluate(req)
    assert res.overallStatus == "COMPILE_FAILED"
    assert not res.passed
    assert res.failureCategory == "COMPILATION_ERROR"
    assert res.compilerDiagnostics is not None
    assert "cannot find symbol" in res.compilerDiagnostics or "c" in res.compilerDiagnostics

def test_valid_python_to_java_execution():
    evaluator = DifferentialEvaluator()
    req = ValidationRequest(
        sourceLanguage="python",
        targetLanguage="java",
        sourceCode="def add(a: int, b: int) -> int:\n    return a + b\n",
        candidateCode="public class Solution {\n    public static int add(int a, int b) {\n        return a + b;\n    }\n}\n",
        entryPoint=EntryPoint(name="add"),
        tests=[
            TestCase(input=[2, 3], expectedOutput=5),
            TestCase(input=[-5, 10], expectedOutput=5),
            TestCase(input=[0, 0], expectedOutput=0)
        ]
    )
    res = evaluator.evaluate(req)
    assert res.overallStatus == "PASSED_AVAILABLE_TESTS"
    assert res.passed
    assert res.passedTestsCount == 3
    assert res.totalTestsCount == 3

def test_java_behavioral_mismatch():
    evaluator = DifferentialEvaluator()
    req = ValidationRequest(
        sourceLanguage="python",
        targetLanguage="java",
        sourceCode="def add(a: int, b: int) -> int:\n    return a + b\n",
        candidateCode="public class Solution {\n    public static int add(int a, int b) {\n        return a - b; // Bug\n    }\n}\n",
        entryPoint=EntryPoint(name="add"),
        tests=[
            TestCase(input=[2, 3], expectedOutput=5),
            TestCase(input=[10, 5], expectedOutput=15)
        ]
    )
    res = evaluator.evaluate(req)
    assert res.overallStatus == "FAILED_BEHAVIORAL_TESTS"
    assert not res.passed
    assert res.passedTestsCount == 0
    assert res.failureCategory == "OUTPUT_MISMATCH"

def test_source_baseline_failure_protection():
    evaluator = DifferentialEvaluator()
    # Source crashes with ZeroDivisionError
    req = ValidationRequest(
        sourceLanguage="python",
        targetLanguage="java",
        sourceCode="def div(a, b):\n    return a / 0\n",
        candidateCode="public class Solution { public static int div(int a, int b) { return a / b; } }",
        entryPoint=EntryPoint(name="div"),
        tests=[TestCase(input=[10, 2], expectedOutput=5)]
    )
    res = evaluator.evaluate(req)
    assert res.overallStatus == "SOURCE_BASELINE_FAILED"
    assert not res.passed
    assert res.failureCategory == "SOURCE_BASELINE_ERROR"

