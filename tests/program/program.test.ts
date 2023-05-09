import { assertEquals } from "../../test_deps.ts";
import { Program } from '../../src/program/program.ts';
import { AsyncLock } from "../../test_deps.ts";

const __dirname = new URL(import.meta.url).pathname;

const flatDSL = [
	{
		id: 'qwerty12345',
		name: 'sender',
		type: 'https://raw.githubusercontent.com/mayahq/maya-symbol-primitives/main/hello-world/sender%400.0.1.ts',
		wires: [['asdfg12345']],
		properties: {},
		children: {
			wires: {
				in: [[]],
				out: [[]],
			},
			symbols: [],
		},
	},
	{
		id: 'asdfg12345',
		name: 'receiver',
		type: 'https://raw.githubusercontent.com/mayahq/maya-symbol-primitives/main/hello-world/receiver%400.0.1.ts',
		wires: [[]],
		properties: {},
		children: {
			wires: {
				in: [[]],
				out: [[]],
			},
			symbols: [],
		},
	},
];

const subflowDSL = [
	{
		"id": 'qwerty12345',
		"name": 'sender',
		"type": 'https://raw.githubusercontent.com/mayahq/maya-symbol-primitives/main/hello-world/sender%400.0.1.ts',
		"wires": [['subflow_1']],
		"properties": {},
		"children": {
			"wires": {
				"in": [[]],
				"out": [[]],
			},
			"symbols": [],
		},
	},
	{
		"id": 'subflow_1',
		"name": 'subflow_1',
		"type": 'subflow',
		"wires": [['re4']],
		"properties": {},
		"children": {
			"wires": {
				"in": [['re1']],
				"out": [['subflow_2']],
			},
			"symbols": [
				{
					"id": 're1',
					"name": 'receiver',
					"type": 'https://raw.githubusercontent.com/mayahq/maya-symbol-primitives/main/hello-world/receiver%400.0.1.ts',
					"wires": [['subflow_2']],
					"properties": {},
					"children": {
						"wires": {
							"in": [[]],
							"out": [[]],
						},
						"symbols": [],
					},
				},
				{
					"id": 'subflow_2',
					"name": 'subflow_2',
					"type": 'subflow',
					"wires": [[]],
					"properties": {},
					"children": {
						"wires": {
							"in": [['re2']],
							"out": [['re3']],
						},
						"symbols": [
							{
								"id": 're2',
								"name": 'receiver',
								"type": 'https://raw.githubusercontent.com/mayahq/maya-symbol-primitives/main/hello-world/receiver%400.0.1.ts',
								"wires": [['re3']],
								"properties": {},
								"children": {
									"wires": {
										"in": [[]],
										"out": [[]],
									},
									"symbols": [],
								},
							},
							{
								"id": 're3',
								"name": 'receiver',
								"type": 'https://raw.githubusercontent.com/mayahq/maya-symbol-primitives/main/hello-world/receiver%400.0.1.ts',
								"wires": [[]],
								"properties": {},
								"children": {
									"wires": {
										"in": [[]],
										"out": [[]],
									},
									"symbols": [],
								},
							},
						],
					},
				},
			],
		},
	},
	{
		"id": 're4',
		"name": 'receiver',
		"type": 'https://raw.githubusercontent.com/mayahq/maya-symbol-primitives/main/hello-world/receiver%400.0.1.ts',
		"wires": [[]],
		"properties": {},
		"children": {
			"wires": {
				"in": [[]],
				"out": [[]],
			},
			"symbols": [],
		},
	},
];

type TestMessage = {
    test: string
}

Deno.test('Program execution', async (t) => {
	await t.step('Flat DSL execution', async () => {
		const program = new Program({ dsl: { symbols: flatDSL } });
		await program.deploy();
	});

    await t.step('Recursive tree-like DSL execution', async () => {
        const program = new Program({ dsl: { symbols: subflowDSL }})
        
        const lock = new AsyncLock()
        const messages: TestMessage[] = []
        const beforeSendHook = (msg: unknown) => {
            lock.acquire('hehe', (done: (e: null, r: unknown) => void) => {
                messages.push((msg as TestMessage))
                done(null, 1)
            })
        }
        program.addHook('beforeSend', beforeSendHook)
        const terminationPromise = new Promise((resolve) => {
            program.addHook('onTerminate', () => resolve(1))
        })

        await program.deploy()
        
        await terminationPromise
        assertEquals(messages.length, 4)
        messages.forEach((msg) => {
            assertEquals(msg.test, 'Hello, World')
        })
    })
});
