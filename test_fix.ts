export function calculateTotal(items: any[]) {
    var total = 0; // Should be const or let
    for (var i = 0; i < items.length; i++) {
        total += items[i].price;
    }
    return total;
}
