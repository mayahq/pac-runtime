import { PropertyObject, TypedMetadata } from '../symbol.d.ts'
import TypedInput from './typedInput.ts'
import Symbol from '../symbol.ts'

abstract class Field {
    abstract evaluateField(symbol: Symbol, propertyName: string, msg: Record<string, unknown>): PropertyObject
    abstract generateSchema(
        propertyName: string,
        field: PropertyObject | TypedInput,
    ): TypedMetadata
}

export default Field
