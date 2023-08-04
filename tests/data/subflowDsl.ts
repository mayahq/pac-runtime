import { LiteGraphSpec } from "../../src/program/hybrid.d.ts";

const subflowDsl: LiteGraphSpec = {
	nodes: [
		{
			id: 'lkwm6c486457840',
			parentId: 'main',
			type: 'gh:mayahq/stdlib/function',
			pos: [-43.72131377656618, -46.89218951426915],
			inputs: [
				{
					name: 'pulse',
					type: 'basepulse',
				},
				{
					name: 'body',
					type: 'string',
					value: 'pulse.value = 3',
				},
				{
					name: 'input',
					type: 'string',
					value: '',
				},
			],
			outputs: [
				{
					name: 'result',
					type: 'eval',
				},
				{
					name: 'pulse',
					type: 'pulse',
				},
			],
		},
		{
			id: 'lkwm7x8s17295325',
			type: 'subflow',
			paletteLabel: 'Subflow 1',
			name: 'Math stuff',
			parentId: 'main',
			pos: [323, -7.578125],
			inputs: [
				{
					name: 'pulse',
					type: 'basepulse',
				},
			],
			outputs: [
				{
					type: 'pulse',
					value: '',
					linkTo: 'lkwm826v54191215',
					name: 'valueOut',
				},
			],
			subgraph: {
				nodes: [
					{
						id: 'lkwm6kd266150240',
						parentId: 'lkwm7x8s17295325',
						type: 'gh:mayahq/stdlib/function',
						pos: [285.3951671584686, -84.41131366322506],
						inputs: [
							{
								name: 'pulse',
								type: 'basepulse',
							},
							{
								name: 'body',
								type: 'string',
								value: 'pulse.value = pulse.value * 2',
							},
							{
								name: 'input',
								type: 'string',
								value: '',
							},
						],
						outputs: [
							{
								name: 'result',
								type: 'eval',
							},
							{
								name: 'pulse',
								type: 'pulse',
							},
						],
					},
					{
						id: 'lkwm6nkb80125933',
						parentId: 'lkwm7x8s17295325',
						type: 'gh:mayahq/stdlib/function',
						pos: [365.8648289263341, 289.06869416716927],
						inputs: [
							{
								name: 'pulse',
								type: 'basepulse',
							},
							{
								name: 'body',
								type: 'string',
								value: 'pulse.value = pulse.value * 3',
							},
							{
								name: 'input',
								type: 'string',
								value: '',
							},
						],
						outputs: [
							{
								name: 'result',
								type: 'eval',
							},
							{
								name: 'pulse',
								type: 'pulse',
							},
						],
					},
					{
						id: 'lkwm7x8s23258501',
						parentId: 'lkwm7x8s17295325',
						type: 'graph/input',
						pos: [-114.49582796194892, -26.782858261484918],
						inputs: [
							{
								name: '',
								type: 'string',
								value: 'myField',
							},
							{
								name: 'allowedTypes',
								type: 'json',
								value:
									'{"string":true,"number":true,"boolean":true,"json":true,"pulse":true,"procedure":true}',
							},
						],
						outputs: [
							{
								name: 'pulseOut',
								type: 'basepulse',
							},
						],
					},
					{
						id: 'lkwm826v54191215',
						parentId: 'lkwm7x8s17295325',
						type: 'graph/output',
						pos: [1043.0811026441997, -55.67011535417629],
						inputs: [
							{
								name: 'fieldName',
								type: 'string',
								value: 'valueOut',
							},
							{
								name: 'outputType',
								type: 'string',
								value: 'pulse',
							},
						],
						outputs: [],
					},
					{
						id: 'lkwmbc5p20979317',
						type: 'subflow',
						name: 'more math',
						parentId: 'lkwm7x8s17295325',
						pos: [594.9979994922506, 132.74033024413487],
						inputs: [
							{
								name: 'pulse',
								type: 'basepulse',
							},
						],
						outputs: [
							{
								type: 'pulse',
								value: '',
								linkTo: 'lkwmbua530473565',
								name: 'finalRes',
							},
						],
						subgraph: {
							nodes: [
								{
									id: 'lkwman1v11557068',
									parentId: 'lkwmbc5p20979317',
									type: 'gh:mayahq/stdlib/function',
									pos: [260.9333592345866, 195.46218663971007],
									inputs: [
										{
											name: 'pulse',
											type: 'basepulse',
										},
										{
											name: 'body',
											type: 'string',
											value: 'pulse.value = pulse.value + 1',
										},
										{
											name: 'input',
											type: 'string',
											value: '',
										},
									],
									outputs: [
										{
											name: 'result',
											type: 'eval',
										},
										{
											name: 'pulse',
											type: 'pulse',
										},
									],
								},
								{
									id: 'lkwmasi612027517',
									parentId: 'lkwmbc5p20979317',
									type: 'gh:mayahq/stdlib/function',
									pos: [599.0527101766979, 242.14812212544075],
									inputs: [
										{
											name: 'pulse',
											type: 'basepulse',
										},
										{
											name: 'body',
											type: 'string',
											value: 'pulse.value = pulse.value + 2',
										},
										{
											name: 'input',
											type: 'string',
											value: '',
										},
									],
									outputs: [
										{
											name: 'result',
											type: 'eval',
										},
										{
											name: 'pulse',
											type: 'pulse',
										},
									],
								},
								{
									id: 'lkwmbc5p54077068',
									parentId: 'lkwmbc5p20979317',
									type: 'graph/input',
									pos: [39.70923167273784, 158.54615836368907],
									inputs: [
										{
											name: '',
											type: 'string',
											value: 'myField',
										},
										{
											name: 'allowedTypes',
											type: 'json',
											value:
												'{"string":true,"number":true,"boolean":true,"json":true,"pulse":true,"procedure":true}',
										},
									],
									outputs: [
										{
											name: 'pulseOut',
											type: 'basepulse',
										},
									],
								},
								{
									id: 'lkwmbua530473565',
									parentId: 'lkwmbc5p20979317',
									type: 'graph/output',
									pos: [983.3310186116006, 213.72044575591644],
									inputs: [
										{
											name: 'fieldName',
											type: 'string',
											value: 'finalRes',
										},
										{
											name: 'outputType',
											type: 'string',
											value: 'pulse',
										},
									],
									outputs: [],
								},
							],
							links: [
								[
									'reactflow__edge-lkwman1v11557068output-1-lkwmasi612027517input-0',
									'lkwman1v11557068',
									1,
									'lkwmasi612027517',
									0,
									-1,
								],
								[
									'reactflow__edge-lkwmbc5p54077068output-0-lkwman1v11557068input-0',
									'lkwmbc5p54077068',
									0,
									'lkwman1v11557068',
									0,
									-1,
								],
								[
									'reactflow__edge-lkwmasi612027517output-1-lkwmbua530473565input-0',
									'lkwmasi612027517',
									1,
									'lkwmbua530473565',
									0,
									-1,
								],
							],
						},
					},
				],
				links: [
					[
						'reactflow__edge-lkwm6kd266150240output-1-lkwm6nkb80125933input-0',
						'lkwm6kd266150240',
						1,
						'lkwm6nkb80125933',
						0,
						-1,
					],
					[
						'reactflow__edge-lkwm7x8s23258501output-0-lkwm6kd266150240input-0',
						'lkwm7x8s23258501',
						0,
						'lkwm6kd266150240',
						0,
						-1,
					],
					[
						'reactflow__edge-lkwm6nkb80125933output-1-lkwmbc5p20979317input-0',
						'lkwm6nkb80125933',
						1,
						'lkwmbc5p20979317',
						0,
						-1,
					],
					[
						'reactflow__edge-lkwmbc5p20979317output-0-lkwm826v54191215input-0',
						'lkwmbc5p20979317',
						0,
						'lkwm826v54191215',
						0,
						-1,
					],
				],
			},
		},
		{
			id: 'lkwm8ry274632824',
			parentId: 'main',
			type: 'gh:mayahq/stdlib/debug',
			pos: [746.1841432226375, 53.98965486476797],
			inputs: [
				{
					name: 'pulse',
					type: 'basepulse',
				},
				{
					name: 'value',
					type: 'string',
					value: '',
				},
			],
			outputs: [
				{
					name: 'value',
					type: 'eval',
				},
				{
					name: 'pulse',
					type: 'pulse',
				},
			],
		}
	],
	links: [
		[
			'reactflow__edge-lkwm7x8s17295325output-0-lkwm8ry274632824input-0',
			'lkwm7x8s17295325',
			0,
			'lkwm8ry274632824',
			0,
			-1,
		],
		[
			'reactflow__edge-lkwm6c486457840output-1-lkwm7x8s17295325input-0',
			'lkwm6c486457840',
			1,
			'lkwm7x8s17295325',
			0,
			-1,
		]
	],
	functions: {},
};

export default subflowDsl