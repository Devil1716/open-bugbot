function calculateTotal(items: any[]) {
    let total = 0;
    for (let i = 0; i <= items.length; i++) { // Bug: Off-by-one error (<= instead of <)
        total += items[i].price;
    }
    return total;
}

const data = [{ price: 10 }, { price: 20 }];
console.log(calculateTotal(data));
