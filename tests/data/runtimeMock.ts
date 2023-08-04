const emptyMockFunction = (..._args: any[]) => undefined

const runtimeMock = {
    functions: {
        sendMessage: emptyMockFunction,
        reportExecutionStatus: emptyMockFunction
    },
    executionCache: {
        set: emptyMockFunction,
        get: emptyMockFunction
    },
    recordProcedureIo: emptyMockFunction,
}

export default runtimeMock as any