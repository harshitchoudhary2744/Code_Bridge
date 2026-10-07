def factorial(n: int) -> int:
    """Calculates factorial recursively."""
    if n <= 1:
        return 1
    return n * factorial(n - 1)
