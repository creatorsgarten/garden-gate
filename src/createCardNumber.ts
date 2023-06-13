/** Length of the access card identifier. Must not exceed 15. */

export function createCardNumber(prefix: string) {
    const charSet =
        '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const randomBits = Array.from(
        crypto.getRandomValues(new Uint8Array(20)),
        (x) => charSet[x % charSet.length],
    ).join('')

    return ('G-' + (prefix ? `${prefix}-` : '') + randomBits).slice(0, 20)
}
