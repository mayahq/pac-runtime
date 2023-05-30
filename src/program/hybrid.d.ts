type PrimitiveType = 'pulse' | 'flow' | 'global' | 'boolean' | 'number' | 'string' | 'json'

type ProcedureRecursiveInput = {
    type: 'procedure'
    id: string
    // portName: string
    value: string
}

type TypedInput = {
    type: PrimitiveType
    value: string | boolean | number | JSON
}

type LambdaInput = {
    type: 'lambda_input'
    portName: string
    value: string
}

type ProcedureInput = ProcedureRecursiveInput | TypedInput | LambdaInput

type ProcedureOutput = {
    type: 'procedure' | 'lambda_output'
    id: string
    portName: string
}

type SubflowOutput = {
    procedureId: string
    portName: string
}

type PulseProcedureInput = {
    type: 'procedure_input'
    procedureId: string
}

type PulseLambdaOutput = {
    type: 'lambda_output'
    portName: string
}

type PulseOutput = PulseProcedureInput | PulseLambdaOutput

export type EvaluateFieldFunc = (args?: Record<string, any>, pulse?: Record<string, any>) => any

export type PulseEventDetail = {
    pulse: Record<string, any>
    metadata: {
        sender: string
        timestamp: number
    }
    destination: string
}

export type Children = {
    pulseIn: string[] // List of procedures that the input pulse connects to.
    outputs: Record<string, SubflowOutput> // Map that records (internal_procedure.portname -> lambda.portname).
    procedures: Record<string, ProcedureDsl>
}

export type ProcedureDsl = {
    id: string // ID that uniquely identifies the symbol within a program.
    type: string // Type of procedure.
    inputs: Record<string, ProcedureInput> // Map of inputs. These can be extracted from the pulse or can be of type eval.
    pulseNext: Record<string, PulseOutput[]> // Map of list of procedures that the corresponding pulse output connects to.
    children?: Children
}

export type ProgramDsl = {
    procedures: Record<string, ProcedureDsl>
}

export type RunnableCallback = (val: any, portName?: string) => void
