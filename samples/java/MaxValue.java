public class MaxValue {
    public static int maxValue(int a, int b) {
        if (a > b) {
            return a;
        }
        return b;
    }

    public static void main(String[] args) {
        System.out.println(maxValue(10, 20));
    }
}
