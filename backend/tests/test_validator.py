"""
Unit tests for Python and Java validation service.
"""

from app.services.validator import validate_code, validate_python, validate_java


def test_python_valid_syntax():
    code = "def multiply(x, y):\n    return x * y"
    res = validate_code(code, "python")
    assert res.syntax is True
    assert res.status == "valid"


def test_python_invalid_syntax():
    code = "def broken(x, y\n    return x *"
    res = validate_code(code, "python")
    assert res.syntax is False
    assert res.status == "invalid"
    assert res.error_details is not None


def test_python_unit_tests_pass():
    code = "def add(a, b):\n    return a + b"
    tests = [
        {"function": "add", "inputs": [2, 3], "expected": 5},
        {"function": "add", "inputs": [10, -5], "expected": 5}
    ]
    res = validate_code(code, "python", tests)
    assert res.syntax is True
    assert res.tests_passed == 2
    assert res.tests_total == 2
    assert res.status == "valid"


def test_python_unit_tests_fail():
    code = "def add(a, b):\n    return a - b"  # intentional bug
    tests = [{"function": "add", "inputs": [2, 3], "expected": 5}]
    res = validate_code(code, "python", tests)
    assert res.syntax is True
    assert res.tests_passed == 0
    assert res.status == "needs_correction"


def test_java_valid_compilation():
    code = """
public class Solution {
    public static int add(int a, int b) {
        return a + b;
    }
}
"""
    res = validate_code(code, "java")
    assert res.syntax is True
    assert res.compilation is True
    assert res.status == "valid"


def test_java_invalid_compilation():
    code = """
public class Solution {
    public static int add(int a, int b) {
        return a + b // missing semicolon
    }
}
"""
    res = validate_code(code, "java")
    assert res.compilation is False
    assert res.status == "invalid"
    assert "error" in res.error_details.lower()
