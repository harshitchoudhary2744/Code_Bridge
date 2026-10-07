"""
Lightweight Code Structure Extraction using Tree-sitter.

Extracts high-level architectural constructs (FUNCTION, CLASS, PARAMETER, IF, LOOP, CALL, RETURN)
to augment sequence-to-sequence translation without exposing massive raw syntax trees.
"""

from typing import List
from tree_sitter import Language, Parser
import tree_sitter_python as tspy
import tree_sitter_java as tsjava

# Initialize Tree-sitter languages and parsers once
_PY_LANG = Language(tspy.language())
_JAVA_LANG = Language(tsjava.language())

_PY_PARSER = Parser(_PY_LANG)
_JAVA_PARSER = Parser(_JAVA_LANG)

# Mapping of Tree-sitter node types to high-level structural tokens
_PYTHON_NODE_MAP = {
    "function_definition": "FUNCTION",
    "class_definition": "CLASS",
    "if_statement": "IF",
    "elif_clause": "IF",
    "else_clause": "IF",
    "for_statement": "LOOP",
    "while_statement": "LOOP",
    "call": "CALL",
    "assignment": "ASSIGNMENT",
    "augmented_assignment": "ASSIGNMENT",
    "return_statement": "RETURN",
    "comparison_operator": "COMPARISON",
}

_JAVA_NODE_MAP = {
    "method_declaration": "FUNCTION",
    "constructor_declaration": "FUNCTION",
    "class_declaration": "CLASS",
    "interface_declaration": "CLASS",
    "formal_parameter": "PARAMETER",
    "if_statement": "IF",
    "for_statement": "LOOP",
    "enhanced_for_statement": "LOOP",
    "while_statement": "LOOP",
    "do_statement": "LOOP",
    "method_invocation": "CALL",
    "assignment_expression": "ASSIGNMENT",
    "variable_declarator": "ASSIGNMENT",
    "return_statement": "RETURN",
    "binary_expression": "COMPARISON",  # will filter for comparisons
}


def extract_structure(code: str, language: str) -> List[str]:
    """
    Extracts a high-level list of structural elements from source code.
    
    Args:
        code: Source code string.
        language: 'python' or 'java'.
        
    Returns:
        List of uppercase structural tags (e.g., ['FUNCTION', 'PARAMETER', 'IF', 'RETURN'])
    """
    if not code or not code.strip():
        return []

    lang = language.lower().strip()
    byte_code = code.encode("utf-8")

    if lang == "python":
        tree = _PY_PARSER.parse(byte_code)
        return _traverse_python(tree.root_node)
    elif lang == "java":
        tree = _JAVA_PARSER.parse(byte_code)
        return _traverse_java(tree.root_node, byte_code)
    else:
        return []


def _traverse_python(node) -> List[str]:
    tokens: List[str] = []

    node_type = node.type
    if node_type in _PYTHON_NODE_MAP:
        tokens.append(_PYTHON_NODE_MAP[node_type])

    # Check for parameter identifiers inside parameters block
    if node_type == "parameters":
        for child in node.children:
            if child.type in ("identifier", "typed_parameter", "default_parameter"):
                tokens.append("PARAMETER")

    for child in node.children:
        # Avoid double-counting children if already summarized
        tokens.extend(_traverse_python(child))

    return tokens


def _traverse_java(node, byte_code: bytes) -> List[str]:
    tokens: List[str] = []

    node_type = node.type
    if node_type == "binary_expression":
        # Check if it's a comparison (<, >, ==, !=, <=, >=)
        for child in node.children:
            text = child.text.decode("utf-8", errors="ignore")
            if text in ("<", ">", "==", "!=", "<=", ">="):
                tokens.append("COMPARISON")
                break
    elif node_type in _JAVA_NODE_MAP:
        tokens.append(_JAVA_NODE_MAP[node_type])

    for child in node.children:
        tokens.extend(_traverse_java(child, byte_code))

    return tokens


def format_structure_text(structure: List[str]) -> str:
    """Formats a list of structural tags into a compact newline-separated string."""
    return "\n".join(structure)
