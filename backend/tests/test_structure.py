"""
Unit tests for Tree-sitter structure extraction service.
"""

from app.services.structure import extract_structure, format_structure_text


def test_extract_structure_python():
    code = """
def max_value(a, b):
    if a > b:
        return a
    return b
"""
    structure = extract_structure(code, "python")
    assert "FUNCTION" in structure
    assert "PARAMETER" in structure
    assert "IF" in structure
    assert "RETURN" in structure
    
    formatted = format_structure_text(structure)
    assert "FUNCTION" in formatted


def test_extract_structure_java():
    code = """
public class Solution {
    public static int add(int a, int b) {
        return a + b;
    }
}
"""
    structure = extract_structure(code, "java")
    assert "CLASS" in structure
    assert "FUNCTION" in structure
    assert "PARAMETER" in structure
    assert "RETURN" in structure


def test_empty_code():
    assert extract_structure("", "python") == []
    assert extract_structure("   ", "java") == []


def test_unsupported_language():
    assert extract_structure("int x = 5;", "cpp") == []
