import Symbol from '../symbol.ts'
import {
    ComponentTypes,
    ListInputTypes,
    PropertyObject,
    TypedInputArgs,
    TypedInputTypes,
    TypedMetadata,
    ValueType,
} from '../symbol.d.ts'
import Fields from './field.ts'

class TypedInput extends Fields {
    value: ValueType = ''
    type: TypedInputTypes = 'string'
    label?: string
    component?: ComponentTypes = 'input'
    allowedTypes?: ListInputTypes = ['string', 'msg', 'global']
    allowInput?: boolean = true
    width?: string
    placeholder?: string
    defaultValue?: ValueType = ''
    required = false

    constructor(input: TypedInputArgs) {
        super()
        this.type = input.type
        if (input.value) {
            this.value = input.value
        } else if (!input.value && input.defaultValue) {
            this.value = input.defaultValue
        }
        switch (input.type) {
            case 'string':
            case 'number':
            case 'boolean':
            case 'date':
            case 're':
            case 'msg':
            case 'global':
            case 'password':
            case 'bin': {
                this['component'] = 'input'
                break
            }
            case 'config': {
                this['component'] = 'select-config'
                break
            }
            case 'json':
            case 'jsonata': {
                this['component'] = 'input-json'
                break
            }
        }
        if (input.label) {
            this!['label'] = input.label
        }
        if (input.allowedTypes) {
            this!['allowedTypes'] = input.allowedTypes
        }
        if (input.allowInput) {
            this!['allowInput'] = input.allowInput
        }
        if (input.width) {
            this!['width'] = input.width
        }
        if (input.placeholder) {
            this!['placeholder'] = input.placeholder
        }
        if (input.required) {
            this.required = input.required
        } else {
            this.required = false
        }
    }

    evaluateField(_symbol: Symbol, _propertyName: string, _msg: Record<string, unknown>): PropertyObject {
        const evaluated: PropertyObject = {
            type: 'str',
            value: '',
        }
        // switch (symbol.properties[propertyName].type) {
        //     case 'str':
        //     case 'num':
        //     case 'bool':
        //     case 'date':
        //     case 're':
        //     case 'password':
        //     case 'bin':
        //     case 'json':
        //     case 'jsonata':
        //     case 'config': {
        //         evaluated.type = this.type
        //         evaluated.value = symbol.properties[propertyName]
        //         break
        //     }
        //     case 'global': {
        //         const keyDepth: string[] = (symbol.properties[propertyName]?.toString() || '').split('.') || []
        //         evaluated.type = this.type
        //         // evaluated.value = lodash.get(symbol.runtime!["storage"]!["internal"], keyDepth);
        //         break
        //     }
        //     case 'msg': {
        //         const keyDepth: string[] = (symbol.properties[propertyName]?.toString() || '').split('.') || []
        //         evaluated.type = this.type
        //         evaluated.value = lodash.get(msg, keyDepth)
        //         break
        //     }
        // }
        return evaluated
    }

    generateSchema(propertyName: string, field: TypedInput): TypedMetadata {
        const result: TypedMetadata = {
            component: field.component || 'str',
            label: field.label || propertyName,
            options: {
                allowedTypes: field.allowedTypes,
                allowInput: field.allowInput,
                defaultValue: field.defaultValue,
                placeholder: field.placeholder,
                width: field.width,
            },
        }
        return result
    }
}

export default TypedInput
