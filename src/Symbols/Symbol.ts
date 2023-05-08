type GenericObject = Record<string, unknown>;
type Children = GenericObject[];
type Properties = GenericObject;
type Position = {
	x: number;
	y: number;
	z: number;
};
interface Metadata {
	position: Position;
	step_id: string;
	tmp_id: string;
	prefix: string;
}

class Symbol {
	id: string;
	name: string;
	type: string;
	properties: Properties;
	children: Children;
	metadata: Metadata;
	description: string;

	constructor() {
		this.id = '';
		this.name = '';
		this.type = '';
		this.properties = {};
		this.children = [];
		this.metadata = {
			position: {
				x: 0,
				y: 0,
				z: 0,
			},
			step_id: '',
			tmp_id: '',
			prefix: '',
		};
		this.description = '';
	}

	onInit(): void {}

	onMessage(): void {}
}

export default Symbol;
