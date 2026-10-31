import json
import os

benchmark_problems = [
    {
        "name": "add",
        "py": "def add(a: int, b: int) -> int:\n    return a + b",
        "java": "public class Solution {\n    public static int add(int a, int b) {\n        return a + b;\n    }\n}"
    },
    {
        "name": "sub",
        "py": "def sub(a: int, b: int) -> int:\n    return a - b",
        "java": "public class Solution {\n    public static int sub(int a, int b) {\n        return a - b;\n    }\n}"
    },
    {
        "name": "mult",
        "py": "def mult(a: int, b: int) -> int:\n    return a * b",
        "java": "public class Solution {\n    public static int mult(int a, int b) {\n        return a * b;\n    }\n}"
    },
    {
        "name": "factorial",
        "py": "def factorial(n: int) -> int:\n    if n <= 1:\n        return 1\n    result = 1\n    for i in range(2, n + 1):\n        result *= i\n    return result",
        "java": "public class Solution {\n    public static int factorial(int n) {\n        if (n <= 1) {\n            return 1;\n        }\n        int result = 1;\n        for (int i = 2; i <= n; i++) {\n            result *= i;\n        }\n        return result;\n    }\n}"
    },
    {
        "name": "isPrime",
        "py": "def isPrime(n: int) -> bool:\n    if n <= 1:\n        return False\n    if n <= 3:\n        return True\n    if n % 2 == 0 or n % 3 == 0:\n        return False\n    i = 5\n    while i * i <= n:\n        if n % i == 0 or n % (i + 2) == 0:\n            return False\n        i += 6\n    return True",
        "java": "public class Solution {\n    public static boolean isPrime(int n) {\n        if (n <= 1) {\n            return false;\n        }\n        if (n <= 3) {\n            return true;\n        }\n        if (n % 2 == 0 || n % 3 == 0) {\n            return false;\n        }\n        int i = 5;\n        while (i * i <= n) {\n            if (n % i == 0 || n % (i + 2) == 0) {\n                return false;\n            }\n            i += 6;\n        }\n        return true;\n    }\n}"
    },
    {
        "name": "truncateDivide",
        "py": "def truncateDivide(a: int, b: int) -> int:\n    return int(a / b)",
        "java": "public class Solution {\n    public static int truncateDivide(int a, int b) {\n        return a / b;\n    }\n}"
    },
    {
        "name": "reverseString",
        "py": "def reverseString(s: str) -> str:\n    return s[::-1]",
        "java": "public class Solution {\n    public static String reverseString(String s) {\n        return new StringBuilder(s).reverse().toString();\n    }\n}"
    },
    {
        "name": "findMax",
        "py": "def findMax(nums: list) -> int:\n    if not nums:\n        return 0\n    max_val = nums[0]\n    for val in nums[1:]:\n        if val > max_val:\n            max_val = val\n    return max_val",
        "java": "public class Solution {\n    public static int findMax(int[] nums) {\n        if (nums == null || nums.length == 0) {\n            return 0;\n        }\n        int maxVal = nums[0];\n        for (int i = 1; i < nums.length; i++) {\n            if (nums[i] > maxVal) {\n                maxVal = nums[i];\n            }\n        }\n        return maxVal;\n    }\n}"
    },
    {
        "name": "countVowels",
        "py": "def countVowels(s: str) -> int:\n    vowels = set('aeiouAEIOU')\n    count = 0\n    for char in s:\n        if char in vowels:\n            count += 1\n    return count",
        "java": "public class Solution {\n    public static int countVowels(String s) {\n        if (s == null) return 0;\n        int count = 0;\n        String vowels = \"aeiouAEIOU\";\n        for (int i = 0; i < s.length(); i++) {\n            if (vowels.indexOf(s.charAt(i)) != -1) {\n                count++;\n            }\n        }\n        return count;\n    }\n}"
    },
    {
        "name": "fibonacci",
        "py": "def fibonacci(n: int) -> int:\n    if n <= 0:\n        return 0\n    if n == 1:\n        return 1\n    a, b = 0, 1\n    for _ in range(2, n + 1):\n        a, b = b, a + b\n    return b",
        "java": "public class Solution {\n    public static int fibonacci(int n) {\n        if (n <= 0) return 0;\n        if (n == 1) return 1;\n        int a = 0;\n        int b = 1;\n        for (int i = 2; i <= n; i++) {\n            int temp = a + b;\n            a = b;\n            b = temp;\n        }\n        return b;\n    }\n}"
    },
    {
        "name": "isEven",
        "py": "def isEven(n: int) -> bool:\n    return n % 2 == 0",
        "java": "public class Solution {\n    public static boolean isEven(int n) {\n        return n % 2 == 0;\n    }\n}"
    },
    {
        "name": "sumRange",
        "py": "def sumRange(n: int) -> int:\n    total = 0\n    for i in range(1, n + 1):\n        total += i\n    return total",
        "java": "public class Solution {\n    public static int sumRange(int n) {\n        int total = 0;\n        for (int i = 1; i <= n; i++) {\n            total += i;\n        }\n        return total;\n    }\n}"
    }
]

train_samples = []
val_samples = []

for idx, p in enumerate(benchmark_problems):
    # Py -> Java (class format)
    sample_py_java = {"source": p["py"], "target": p["java"]}
    # Java -> Py
    sample_java_py = {"source": p["java"], "target": p["py"]}
    
    # Also extract method only
    method_java = "\n".join([line for line in p["java"].split("\n") if "class Solution" not in line and line.strip() != "}"]).strip()
    sample_py_method = {"source": p["py"], "target": method_java}

    target_list = val_samples if idx % 4 == 0 else train_samples
    target_list.append(sample_py_java)
    target_list.append(sample_java_py)
    train_samples.append(sample_py_method)

os.makedirs("ml/data", exist_ok=True)
with open("ml/data/train.json", "w", encoding="utf-8") as f:
    json.dump(train_samples, f, indent=2)

with open("ml/data/val.json", "w", encoding="utf-8") as f:
    json.dump(val_samples, f, indent=2)

print(f"Generated {len(train_samples)} training samples and {len(val_samples)} validation samples.")

