class UnmatchedDataTypeException implements Error {
    name = "UnmatchedDataTypeException";
    message: string;
    constructor(message: string) {
        this.message = message
    }
}


export default {
    UnmatchedDataTypeException
}