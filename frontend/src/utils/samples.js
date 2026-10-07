export const SAMPLE_PROGRAMS = [
  {
    id: 'add',
    title: 'Add Numbers',
    description: 'Computes the sum of two integers',
    python: `def add(a, b):
    return a + b`,
    java: `public class Solution {
    public static int add(int a, int b) {
        return a + b;
    }
}`,
    tests: [
      { function: 'add', inputs: [2, 3], expected: 5 },
      { function: 'add', inputs: [-1, 1], expected: 0 },
      { function: 'add', inputs: [10, 20], expected: 30 }
    ]
  },
  {
    id: 'max_two',
    title: 'Maximum of Two Numbers',
    description: 'Returns the larger of two integer values',
    python: `def max_value(a, b):
    if a > b:
        return a
    return b`,
    java: `public class Solution {
    public static int maxValue(int a, int b) {
        if (a > b) {
            return a;
        }
        return b;
    }
}`,
    tests: [
      { function: 'max_value', inputs: [10, 20], expected: 20 },
      { function: 'max_value', inputs: [5, 2], expected: 5 },
      { function: 'max_value', inputs: [7, 7], expected: 7 }
    ]
  },
  {
    id: 'factorial',
    title: 'Factorial',
    description: 'Calculates the factorial of a non-negative integer recursively',
    python: `def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)`,
    java: `public class Solution {
    public static int factorial(int n) {
        if (n <= 1) {
            return 1;
        }
        return n * factorial(n - 1);
    }
}`,
    tests: [
      { function: 'factorial', inputs: [0], expected: 1 },
      { function: 'factorial', inputs: [4], expected: 24 },
      { function: 'factorial', inputs: [5], expected: 120 }
    ]
  },
  {
    id: 'fibonacci',
    title: 'Fibonacci',
    description: 'Calculates the nth Fibonacci number',
    python: `def fibonacci(n):
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    return fibonacci(n - 1) + fibonacci(n - 2)`,
    java: `public class Solution {
    public static int fibonacci(int n) {
        if (n <= 0) {
            return 0;
        } else if (n == 1) {
            return 1;
        }
        return fibonacci(n - 1) + fibonacci(n - 2);
    }
}`,
    tests: [
      { function: 'fibonacci', inputs: [0], expected: 0 },
      { function: 'fibonacci', inputs: [1], expected: 1 },
      { function: 'fibonacci', inputs: [6], expected: 8 }
    ]
  },
  {
    id: 'is_even',
    title: 'Even Number Check',
    description: 'Checks if a given number is even',
    python: `def is_even(n):
    return n % 2 == 0`,
    java: `public class Solution {
    public static boolean isEven(int n) {
        return n % 2 == 0;
    }
}`,
    tests: [
      { function: 'is_even', inputs: [4], expected: true },
      { function: 'is_even', inputs: [7], expected: false }
    ]
  },
  {
    id: 'sum_loop',
    title: 'Simple Loop (Sum 1 to N)',
    description: 'Computes sum of numbers from 1 up to N using a loop',
    python: `def sum_up_to(n):
    total = 0
    for i in range(1, n + 1):
        total += i
    return total`,
    java: `public class Solution {
    public static int sumUpTo(int n) {
        int total = 0;
        for (int i = 1; i <= n; i++) {
            total += i;
        }
        return total;
    }
}`,
    tests: [
      { function: 'sum_up_to', inputs: [5], expected: 15 },
      { function: 'sum_up_to', inputs: [10], expected: 55 }
    ]
  }
];
