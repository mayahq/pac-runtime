function generateId(): string {
    const bytes: [string] = [""];
    for (let i=0;i<8;i++) {
        bytes.push(Math.round(0xff*Math.random()).toString(16).padStart(2,'0'));
    }
    return bytes.join("").trim();
}

export default generateId;