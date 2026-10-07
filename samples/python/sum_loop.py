def sum_up_to(n: int) -> int:
    """Calculates sum of numbers from 1 to n using a loop."""
    total = 0
    for i in range(1, n + 1):
        total += i
    return total
