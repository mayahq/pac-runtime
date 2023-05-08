export function getSmallRandomId(): string {
    return `${Date.now().toString(36)}${Math.floor(Math.random()*100000).toString(36)}`
}