import {isCallExpression, isNumericLiteral, isStringLiteral, Node} from 'typescript';
import {extendRepresentationPropertyConfig, extractRepresentationPropertyValue} from "./representation/property/utils";
import {Decorator} from "./type";

/**
 * Get Decorators for a specific node.
 *
 * @param node
 * @param isMatching
 */
export function getDecorators(node: Node, isMatching?: (identifier: DecoratorData) => boolean): DecoratorData[] {
    const decorators = node.decorators;
    if (!decorators || !decorators.length) { return []; }

    const items = decorators
        .map(d => {
            const result: any = {
                arguments: [],
                typeArguments: []
            };
            let x: any = d.expression;

            if (isCallExpression(x)) {
                if (x.arguments) {
                    result.arguments = x.arguments.map((argument: any) => {
                        if (isStringLiteral(argument) || isNumericLiteral(argument)) {
                            return argument.text;
                        } else {
                            return argument;
                        }
                    });
                }

                if (x.typeArguments) {
                    result.typeArguments = x.typeArguments;
                }

                x = x.expression;
            }

            result.text = x.text || x.name.text;

            return result as DecoratorData;
        });

    return typeof isMatching === 'undefined' ? items : items.filter(isMatching);
}

function getDecorator(node: Node, isMatching: (identifier: DecoratorData) => boolean) {
    const decorators = getDecorators(node, isMatching);
    if (!decorators || !decorators.length) { return undefined; }

    return decorators[0];
}

export function getDecoratorName(node: Node, isMatching: (identifier: DecoratorData) => boolean) : string | undefined {
    const decorator = getDecorator(node, isMatching);
    return decorator ? decorator.text : undefined;
}

export function getDecoratorTextValue(node: Node, isMatching: (identifier: DecoratorData) => boolean) : string | undefined {
    const decorator = getDecorator(node, isMatching);
    return decorator && typeof decorator.arguments[0] === 'string' ? decorator.arguments[0] as string : undefined;
}

export function getDecoratorOptions(node: Node, isMatching: (identifier: DecoratorData) => boolean) {
    const decorator = getDecorator(node, isMatching);
    return decorator && typeof decorator.arguments[1] === 'object' ? decorator.arguments[1] as { [key: string]: any } : undefined;
}

export function isDecorator(node: Node, isMatching: (identifier: DecoratorData) => boolean) {
    const decorators = getDecorators(node, isMatching);
    return !(!decorators || !decorators.length);
}

export interface DecoratorData {
    text: string;
    arguments: any[];
    typeArguments: any[];
}

export class DecoratorManager {
    protected type: Decorator.Type;
    protected config: Decorator.Representation[] = [];

    // -------------------------------------------

    constructor(
        type: Decorator.Type,
        representationConfig: Decorator.Representation | Decorator.Representation[]
    ) {
        this.type = type;
        this.config = Array.isArray(representationConfig) ? representationConfig : [representationConfig];
    }

    // -------------------------------------------

    public getNames(): string[] {
        return this.config.map(config => config.id);
    }

    public isPresentOnNode(node: Node): boolean {
        return typeof this.matchToNodeDecorator(node).decorator !== 'undefined';
    }

    // -------------------------------------------

    public getPropertyValue<T>(
        decorator: DecoratorData,
        propertyConfig: Decorator.PropertyConfig
    ): undefined | T {
        return extractRepresentationPropertyValue(decorator, propertyConfig) as undefined | T;
    }

    // -------------------------------------------

    public getPropertyById(id: string, type: Decorator.PropertyType = 'SIMPLE'): Decorator.PropertyConfig | undefined {
        const args = this.getPropertiesByIds(id, [type]);
        return args[type] || undefined;
    }

    public getPropertiesByIds(representationName: string, types: Decorator.PropertyType[]): Record<Decorator.PropertyType, Decorator.PropertyConfig> {
        const properties: Record<Decorator.PropertyType | string, Decorator.PropertyConfig> = {};

        types.map(type => properties[type] = undefined);

        const index = this.config.findIndex(config => config.id === representationName);
        if (index === -1) {
            return properties;
        }

        const representation: Decorator.Representation = this.config[index];

        const args: Decorator.PropertyConfig[] = representation.properties.filter((arg: Decorator.PropertyConfig) => typeof arg.type === 'undefined' || types.indexOf(arg.type) !== -1);
        for (let j = 0; j < args.length; j++) {
            const property = extendRepresentationPropertyConfig(args[j]);
            properties[property.type] = property;
        }

        return properties;
    }

    // -------------------------------------------

    public matchToNodeDecorator(node: Node): Decorator.Representation {
        const decorators = getDecorators(node);
        const decoratorNames = decorators.map(decorator => decorator.text);

        for (let i = 0; i < this.config.length; i++) {
            const index = decoratorNames.indexOf(this.config[i].id);
            if (index !== -1) {
                return {
                    decorator: decorators[index] || undefined,
                    decorators: decorators.filter(decorator => decorator.text === decorators[index].text),
                    ...this.config[i]
                };
            }
        }

        return {
            decorators: [],
            decorator: undefined,
            id: undefined
        };
    }
}
