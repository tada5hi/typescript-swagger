import {Decorator} from "../type";
import {DecoratorData} from "../utils";
import {extendRepresentationPropertyConfig, extractRepresentationPropertyValue} from "./property/utils";

export class RepresentationManager {
    constructor(
        protected representation: Decorator.Representation,
        public readonly decorators: DecoratorData[]
    ) {
        this.extendProperties();
    }

    // -------------------------------------------

    /**
     * Get one or more specific value(s) of the decorator arguments or typeArguments.
     * @param type
     * @param decoratorOrIndex
     */
    public getPropertyValue(
        type: Decorator.PropertyType | Decorator.PropertyConfig = 'SIMPLE',
        decoratorOrIndex?: number | DecoratorData
    ) : unknown | undefined {
        const config : Decorator.PropertyConfig = typeof type === 'string' ? this.getPropertyConfiguration(type) : type;
        if(typeof config === 'undefined') {
            return undefined;
        }

        let decorator : DecoratorData;

        if(
            typeof decoratorOrIndex === 'number' ||
            typeof decoratorOrIndex === 'undefined'
        ) {
            decoratorOrIndex = decoratorOrIndex ?? 0;
            if (0 > decoratorOrIndex || decoratorOrIndex >= this.decorators.length) {
                return undefined;
            }

            decorator = this.decorators[decoratorOrIndex];
        } else {
            decorator = decoratorOrIndex;
        }

        return extractRepresentationPropertyValue(decorator, config);
    }

    // -------------------------------------------

    public getPropertyConfiguration(type: Decorator.PropertyType = 'SIMPLE') : Decorator.PropertyConfig | undefined {
        // tslint:disable-next-line:no-shadowed-variable
        const index = this.representation.properties.findIndex(property => property.type === type);
        if(index === -1) {
            return undefined;
        }

        return this.representation.properties[index];
    }

    public getPropertyConfigurations(types?: Decorator.PropertyType[]) : Decorator.PropertyConfig[] {
        if (typeof types === 'undefined') {
            return this.representation.properties;
        }

        return this.representation.properties
            // tslint:disable-next-line:no-shadowed-variable
            .filter(property => types.indexOf(property.type) !== -1);
    }

    // -------------------------------------------

    protected extendProperties() : void {
        this.representation.properties = this.representation.properties
            .map(property => extendRepresentationPropertyConfig(property));
    }
}

