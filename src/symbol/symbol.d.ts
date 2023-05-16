import type TypedInput from './inputs/typedInput.ts'
import type Field from './inputs/field.ts'

export interface OnMessageCallback {
    (done: unknown): void
}

export type GenericArray<T = unknown> = Array<T>

export type ValueType = string | number | boolean | Array<unknown> | Record<string, unknown> | TypedInput
type PropertyObject = {
    value: ValueType
    type: PrimitiveTypes | TypedInputTypes
}

export type PrimitiveTypes = 'str' | 'num' | 'bool'

export type TypedInputTypes =
    | 'str'
    | 'num'
    | 'bool'
    | 'json'
    | 'date'
    | 'msg'
    | 'global'
    | 're'
    | 'jsonata'
    | 'password'
    | 'bin'
    | 'config'

export type ComponentTypes =
    | 'input'
    | 'select'
    | 'checkbox'
    | 'radio'
    | 'toggle'
    | 'editable-table'
    | 'select-config'
    | 'input-json'

export type ListInputTypes = Array<TypedInputTypes>
export type TypedInputArgs = {
    value?: ValueType
    type: TypedInputTypes
    allowedTypes?: ListInputTypes
    defaultValue?: ValueType
    label?: string
    width?: string
    placeholder?: string
    allowInput?: boolean
    required?: boolean
}

export type TypedInputOptions = {
    allowedTypes?: ListInputTypes
    defaultValue?: unknown
    width?: string
    placeholder?: string
    allowInput?: boolean
}

export type TypedMetadata = {
    component: string
    label?: string
    options?: TypedInputOptions
}
export interface Property {
    [fieldName: string]: Field
}

export type Wires = Array<Array<string>> | [[]]
export interface ChildWires {
    in: Array<Array<string>> | [[]]
    out: Array<Array<string>> | [[]]
}
export type Position = {
    x: number
    y: number
}
export type Metadata = {
    position?: Position
    step_id?: string
    tmp_id?: string
    prefix?: string
    color?: string
    icon?: string
} | Record<string, unknown>

interface Children {
    wires: ChildWires
    symbols: SymbolDsl[] | []
}

interface Schema {
    inputSchema?: {
        [name: string]: {
            type: unknown
            description: string
        }
    }
    outputSchema?: {
        [name: string]: {
            type: unknown
            description: string
        }
    }
    propertiesSchema: Property
    editorProperties: {
        icon: string
        color: string
        paletteLabel: string
        category: string
    }
}

export interface SymbolImpl {
    id?: string
    label?: string
    children?: Children
    metadata?: Metadata
    wires?: Wires
    properties?: {
        [fieldName: string]: PropertyObject
    }
}

export interface SymbolDsl {
    id: string
    type: string
    description?: string
    isConfig?: boolean
    properties?: {
        [fieldName: string]: PropertyObject
    }
    children?: Children
    metadata?: Metadata
    schema?: {
        inputSchema?: {
            [name: string]: {
                type: unknown
                description: string
            }
        }
        outputSchema?: {
            [name: string]: {
                type: unknown
                description: string
            }
        }
        propertiesSchema: {
            [name: string]: TypedMetadata
        }
        editorProperties?: {
            icon: string
            color: string
            paletteLabel: string
            category: string
        }
    }
    wires: Wires
}
