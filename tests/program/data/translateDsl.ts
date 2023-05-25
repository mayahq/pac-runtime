import { ProgramDsl } from '../../../src/program/hybrid.d.ts'

const node = (id: string) => {
    return { id, type: 'function', inputs: {}, pulseNext: {} }
}

export const simpleTranslateTestDsl: ProgramDsl = {
    procedures: {
        '1': {
            ...node('1'),
            pulseNext: {
                out1: [{ type: 'procedure_input', procedureId: '2' }],
            },
        },
        '2': {
            ...node('2'),
            type: 'subflow',
            pulseNext: {
                name: [{ type: 'procedure_input', procedureId: '5' }],
                email: [{ type: 'procedure_input', procedureId: '6' }],
            },
            children: {
                pulseIn: ['3', '4'],
                outputs: {},
                procedures: {
                    '3': {
                        ...node('3'),
                        pulseNext: {
                            output1: [
                                { type: 'procedure_input', procedureId: '4' },
                                { type: 'lambda_output', portName: 'name' },
                            ],
                            output2: [{ type: 'lambda_output', portName: 'email' }],
                        },
                    },
                    '4': {
                        ...node('4'),
                        pulseNext: {
                            subout: [{ type: 'lambda_output', portName: 'email' }],
                        },
                        children: {
                            pulseIn: ['7'],
                            outputs: {},
                            procedures: {
                                '7': {
                                    ...node('7'),
                                    pulseNext: {
                                        output1: [{ type: 'procedure_input', procedureId: '8' }],
                                    },
                                },
                                '8': {
                                    ...node('8'),
                                    pulseNext: {
                                        output1: [{ type: 'lambda_output', portName: 'subout' }],
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '5': {
            ...node('5'),
            pulseNext: {
                out1: [{ type: 'procedure_input', procedureId: '2' }],
            },
        },
        '6': node('6'),
    },
}
