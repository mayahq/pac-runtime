import { Context } from "../runtime/runtime.d.ts"

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
    value?: string
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

export type EvaluateFieldFunc = (pulse?: Record<string, any>, ctx?: Context) => any

export type PulseEventDetail = {
    pulse: Record<string, any>
    metadata: {
        sender: string
        timestamp: number
    }
    destination: string
    context?: Context
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

export type RunnableCallback = (val: any, portName?: string, ctx?: Context) => void

export type LiteGraphNodeOutput = {
    name: string
    type: string | number
    links?: string | null | number[]
    value?: string | number | boolean | JSON
    linkType?: string
}

export type LiteGraphNodeInput = {
    name: string
    type: string | number
    link: string | null | number
    value?: string | number | boolean | JSON
    label?: string
    linkType?: string
}

export interface LiteGraphNode {
    id: number
    type: string
    pos?: number[]
    size?: Record<string, number> | number[]
    flags?: any
    mode?: number
    outputs?: LiteGraphNodeOutput[]
    inputs?: LiteGraphNodeInput[]
    properties?: Record<string, any>
    subgraph?: LiteGraphSpec
    boxcolor?: string
}

/**
 * links[0]: link ID
 * links[1]: Origin ID
 * links[2]: Origin port index
 * links[3]: Destination ID
 * links[4]: Destination port index
 * links[5]: Type (what the fuck is that?)
 */
type LiteGraphLinks = (number | string)[][]

export type LiteGraphSpec = {
    nodes: LiteGraphNode[]
    links: LiteGraphLinks
    last_node_id?: number
    last_link_id?: number
    groups?: any[]
    config?: Record<string, any>
    version?: number
}

export type ProgramEvent = 'onProcedureDone'
export type OnProcDoneHook = (val: any, nodeId: string, portName?: string) => any

export type ProgramHook = OnProcDoneHook
