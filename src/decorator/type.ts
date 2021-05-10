import {Node} from "typescript";
import {hasOwnProperty} from "../metadata/resolver/utils";
import {DecoratorData, getDecorators} from "../utils/decoratorUtils";
import {findBuildInIDRepresentation, isBuildInIncluded} from "./build-in";
import {findLibraryIDRepresentation, isLibraryIncluded, Library} from "./library";

export namespace Decorator {
    export type ClassID =
        'SWAGGER_TAGS' |
        'CLASS_PATH' |
        MethodAndCLassID
        ;

    export type MethodAndCLassID =
        'REQUEST_ACCEPT' |
        'RESPONSE_EXAMPLE' |
        'RESPONSE_DESCRIPTION' |
        'REQUEST_CONSUMES' |
        'RESPONSE_PRODUCES' |
        'SWAGGER_HIDDEN'
        ;

    export type MethodHttpVerbID =
        'ALL' |
        'GET' |
        'POST' |
        'PUT' |
        'DELETE' |
        'PATCH' |
        'OPTIONS' |
        'HEAD';

    export type MethodID =
        'METHOD_PATH' |
        MethodHttpVerbID |
        MethodAndCLassID
        ;

    export type ParameterID =
        ParameterServerID |
        'IS_INT' |
        'IS_LONG' |
        'IS_FlOAT' |
        'IS_DOUBLE'
        ;

    export type ParameterServerID =
        'SERVER_CONTEXT' |
        'SERVER_PARAMS' |
        'SERVER_QUERY' |
        'SERVER_FORM' |
        'SERVER_BODY' |
        'SERVER_HEADERS' |
        'SERVER_COOKIES' |
        'SERVER_PATH_PARAMS' |
        'SERVER_FILE_PARAM' |
        'SERVER_FILES_PARAM';

    export type ID = ClassID | MethodID | ParameterID;

    export class RepresentationResolver {
        protected representationConfig: Array<RepresentationConfig> = [];

        constructor(protected id: ID, representationConfig: RepresentationConfig | Array<RepresentationConfig>) {
            this.representationConfig = Array.isArray(representationConfig) ? representationConfig : [representationConfig];
        }

        // -------------------------------------------

        public getNames() {
            return this.representationConfig.map(config => config.name);
        }

        // -------------------------------------------

        public isPresentOnNode(node: Node) {
            const representationConfig = this.buildRepresentationConfigFromNode(node);

            return typeof representationConfig.decorator !== 'undefined';
        }

        // -------------------------------------------

        public getDecoratorPropertyValueAsArray(decorator: DecoratorData, property?: Property) : undefined | Array<any> {
            if(typeof property === 'undefined') {
                return undefined;
            }

            const value = this.getDecoratorPropertyValue(decorator, property);
            if(typeof value === 'undefined') {
                return [];
            }

            return property.amount === 'all' ? value : [value];
        }

        public getDecoratorPropertyValueAsItem(decorator: DecoratorData, property?: Property) : undefined | any {
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

        public getDecoratorPropertyValue(decorator: DecoratorData, property: Property) : any | Array<any> | undefined {
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

        public getPropertyByType(representationName: string, type: PropertyType = 'SIMPLE') : Property | undefined {
            const args = this.getPropertiesByTypes(representationName, [type]);
            return args[type] || undefined;
        }

        public getPropertiesByTypes(representationName: string, types: Array<PropertyType>) : Record<PropertyType, Property> {
            const properties : Record<PropertyType | string, Property> = {};

            types.map(type => properties[type] = undefined);

            const index = this.representationConfig.findIndex(config => config.name === representationName);
            if(index === -1) {
                return properties;
            }

            const representation : RepresentationConfig = this.representationConfig[index];

            const args : Array<Property> = representation.properties.filter((arg: Property) => typeof arg.type === 'undefined' || types.indexOf(arg.type) !== -1);
            for(let j=0; j<args.length; j++) {
                const property = Decorator.RepresentationResolver.fillProperty(args[j]);
                properties[property.type] = property;
            }

            return properties;
        }

        // -------------------------------------------

        public buildRepresentationConfigFromNode(node: Node) : RepresentationConfig {
            const decorators = getDecorators(node);
            const decoratorNames = decorators.map(decorator => decorator.text);

            for(let i=0; i<this.representationConfig.length; i++) {
                const index = decoratorNames.indexOf(this.representationConfig[i].name);
                if(index !== -1) {
                    return {
                        decorator: decorators[index] || undefined,
                        decorators: decorators.filter(decorator => decorator.text === decorators[index].text),
                        ...this.representationConfig[i]
                    };
                }
            }

            return {
                decorators: [],
                decorator: undefined,
                name: undefined
            };
        }

        // -------------------------------------------

        private static fillProperty(property: Property) {
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
    }

    // -------------------------------------------

    export type PropertyType = 'PAYLOAD' | 'STATUS_CODE' | 'DESCRIPTION' /* | 'PATH' | 'MEDIA_TYPE' | 'KEY' */ | 'OPTIONS' | 'SIMPLE' | 'TYPE';
    export interface Property {
        /**
         * Default: 'SIMPLE'
         */
        type?: PropertyType;
        /**
         * Default: 'argument'
         */
        declaredAs?: 'argument' | 'typeArgument';
        /**
         * Default: one
         */
        amount?: 'one' | 'all';
        /**
         * Default: 0
         */
        position?: number;
    }

    // -------------------------------------------

    export type Representation = Record<ID, RepresentationConfig | Array<RepresentationConfig>>;
    export interface RepresentationConfig {
        name: string;
        decorator?: DecoratorData;
        decorators?: Array<DecoratorData>;
        properties?: Array<Property>;
    }

    export type ConfigLibrary =
        Library |
        Array<Library> |
        Record<
            Library,
            Array<ID> | ID | Record<ID, boolean>
            >;

    export interface Config {
        useLibrary?: ConfigLibrary;
        useBuildIn?: boolean | Array<ID> | Record<ID, boolean> | ID;
        override?: Representation;
    }

    // -------------------------------------------
    

    
    const handlerCache : Partial<Record<ID, RepresentationResolver>> = {};

    function toManyRepresentation(representation: RepresentationConfig | Array<RepresentationConfig>) : Array<RepresentationConfig> {
        return Array.isArray(representation) ? representation : [representation];
    }

    export function getRepresentationHandler(id: ID, map?: Config) : RepresentationResolver {
        let value : Array<RepresentationConfig> = [];
        
        if(hasOwnProperty(handlerCache, id)) {
            return handlerCache[id];
        }
        
        if(typeof map === 'undefined' || typeof map.override === 'undefined' || !hasOwnProperty(map.override, id)) {
            const libraries : Array<Library> = [
                "@decorators/express", 
                "typescript-rest"
            ];
            
            for(let i=0; i<libraries.length; i++) {
                if(!isLibraryIncluded(libraries[i], map)) {
                    continue; 
                }

                const currentValue = findLibraryIDRepresentation(libraries[i], id, map);

                if(typeof currentValue !== 'undefined') {
                    value = [...value, ...toManyRepresentation(currentValue)];
                }
            }

            if(isBuildInIncluded(map, id)) {
                const buildInValue = findBuildInIDRepresentation(id);
                if(typeof buildInValue !== 'undefined') {
                    value = [...value, ...toManyRepresentation(buildInValue)];
                }
            }
        } else {
            value = toManyRepresentation(map.override[id]);
        }

        const resolver = new RepresentationResolver(id, value);

        handlerCache[id] = resolver;

        return resolver;
    }
}
