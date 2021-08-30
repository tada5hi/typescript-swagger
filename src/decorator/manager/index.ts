import {Node} from "typescript";
import {Decorator} from "../type";
import {DecoratorData, getDecorators} from "../utils";

export class RepresentationManager {
    protected type: Decorator.Type;
    protected config: Decorator.RepresentationConfig[] = [];

    // -------------------------------------------

    constructor(
        type: Decorator.Type,
        representationConfig: Decorator.RepresentationConfig | Decorator.RepresentationConfig[]
    ) {
        this.type = type;
        this.config = Array.isArray(representationConfig) ? representationConfig : [representationConfig];
    }

    // -------------------------------------------

    public getNames() : string[] {
        return this.config.map(config => config.id);
    }

    public isPresentOnNode(node: Node) : boolean {
        return typeof this.matchToNodeDecorator(node).decorator !== 'undefined';
    }

    // -------------------------------------------

    public getPropertyValueAsArray<T extends 'array' | 'item'>(decorator: DecoratorData, property?: Decorator.Property, format?: T) : undefined | any[] {
        if(typeof property === 'undefined') {
            return undefined;
        }

        const value = this.getDecoratorPropertyValue(decorator, property);
        if(typeof value === 'undefined') {
            return [];
        }

        return property.amount === 'all' ? value : [value];
    }

    public getPropertyValueAsItem(decorator: DecoratorData, property?: Decorator.Property) : undefined | any {
        if(typeof property === 'undefined') {
            return undefined;
        }

        const value = this.getDecoratorPropertyValue(decorator, property);

        if(property.amount === 'all') {
            if(Array.isArray(value) && value.length > 0) {
                return value[0];
            }
        }

        return value;
    }

    public getDecoratorPropertyValue(decorator: DecoratorData, property: Decorator.Property) : any | any[] | undefined {
        if(typeof property === 'undefined') {
            return undefined;
        }

        switch (property.amount) {
            case "all":
                switch (property.declaredAs) {
                    case 'typeArgument':
                        return  decorator.typeArguments;
                    case 'argument':
                        return decorator.arguments;
                }
                break;
            case "one":
                switch (property.declaredAs) {
                    case 'typeArgument':
                        if (decorator.typeArguments.length > property.position) {
                            return decorator.typeArguments[property.position];
                        }
                        break;
                    case 'argument':
                        if (decorator.arguments.length > property.position) {
                            return decorator.arguments[property.position];
                        }
                        break;
                }
                break;
        }

        return undefined;
    }

    // -------------------------------------------

    public getPropertyByType(representationName: string, type: Decorator.PropertyType = 'SIMPLE') : Decorator.Property | undefined {
        const args = this.getPropertiesByTypes(representationName, [type]);
        return args[type] || undefined;
    }

    public getPropertiesByTypes(representationName: string, types: Decorator.PropertyType[]) : Record<Decorator.PropertyType, Decorator.Property> {
        const properties : Record<Decorator.PropertyType | string, Decorator.Property> = {};

        types.map(type => properties[type] = undefined);

        const index = this.config.findIndex(config => config.id === representationName);
        if(index === -1) {
            return properties;
        }

        const representation : Decorator.RepresentationConfig = this.config[index];

        const args : Decorator.Property[] = representation.properties.filter((arg: Decorator.Property) => typeof arg.type === 'undefined' || types.indexOf(arg.type) !== -1);
        for(let j=0; j<args.length; j++) {
            const property = extendDecoratorProperty(args[j]);
            properties[property.type] = property;
        }

        return properties;
    }

    // -------------------------------------------

    public matchToNodeDecorator(node: Node) : Decorator.RepresentationConfig {
        const decorators = getDecorators(node);
        const decoratorNames = decorators.map(decorator => decorator.text);

        for(let i=0; i<this.config.length; i++) {
            const index = decoratorNames.indexOf(this.config[i].id);
            if(index !== -1) {
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

export function extendDecoratorProperty(property: Decorator.Property) : Decorator.Property {
    if(typeof property.type === 'undefined') {
        property.type = 'SIMPLE';
    }

    if(typeof property.declaredAs === 'undefined') {
        property.declaredAs = 'argument';
    }

    if(typeof property.amount === 'undefined') {
        property.amount = 'one';
    }

    if(typeof property.position === 'undefined') {
        property.position = 0;
    }

    return property;
}
