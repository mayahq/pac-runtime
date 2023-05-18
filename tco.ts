async function tco(n: number): Promise<any> {
    if (n === 10_000) return n
    // console.log(n)
    return tco(n + 1)
}

tco(0).then(console.log)
