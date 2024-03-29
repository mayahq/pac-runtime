import { Context } from '../runtime/runtime.d.ts'
import { Runnable } from './hybrid.ts'

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
        parent: Runnable | null
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
    function?: string // ID of the function that this procedure is a representation of
}

export type ProcedureMap = Record<string, ProcedureDsl>

export type ProgramDsl = {
    procedures: ProcedureMap
    functions?: ProcedureMap
}

export type RunnableCallback = (val: any, portName?: string, ctx?: Context) => void

export type LiteGraphNodeOutput = {
    name: string
    type: string | number
    links?: string | null | number[]
    value?: string | number | boolean | JSON
    linkType?: string
    linkTo?: string
}

export type LiteGraphNodeInput = {
    name: string
    type: string | number
    link?: string | null | number
    value?: string | number | boolean | JSON
    label?: string
    linkType?: string
    linkTo?: string
}

export interface LiteGraphNode {
    // Stuff you need for execution
    id: number | string
    type: string
    subgraph?: LiteGraphSpec
    function?: string
    outputs?: LiteGraphNodeOutput[]
    inputs?: LiteGraphNodeInput[]
    
    // Stuff you need for the frontend
    parentId?: string
    pos?: number[]
    boxcolor?: string
    paletteLabel?: string
    name?: string
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
    functions?: Record<string, LiteGraphNode>
    last_node_id?: number
    last_link_id?: number
    groups?: any[]
    config?: Record<string, any>
    version?: number
}

export type ProgramEvent = 'onProcedureDone'
export type OnProcDoneHook = (val: any, nodeId: string, portName?: string) => any

export type ProgramHook = OnProcDoneHook
