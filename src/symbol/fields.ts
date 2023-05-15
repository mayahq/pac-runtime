import { PropertyObject, TypedMetadata } from '../symbol/symbol.d.ts'
import TypedInput from './inputs/typedInput.ts'
import Symbol from '../symbol/symbol.ts'

abstract class Fields {
    abstract evaluateField(symbol: Symbol, msg: Record<string, unknown>): PropertyObject
    abstract generateSchema(propertyName: string, field: PropertyObject | TypedInput): TypedMetadata
}

export default Fields
