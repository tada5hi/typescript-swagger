import {hasOwnProperty} from "../metadata/resolver/utils";
import {findBuildInIDRepresentation, isBuildInIncluded} from "./build-in";
import {findLibraryIDRepresentation, isLibraryIncluded, Library} from "./library";
import {RepresentationManager} from "./manager";
import {DecoratorData} from "./utils";

export namespace Decorator {
    /**
     * A decorator type is an identifier which is associated
     * to specific decorator names.
     */

    export type ClassType =
        'SWAGGER_TAGS' |
        'CLASS_PATH' |
        MethodAndCLassType
        ;

    export type MethodAndCLassType =
        'REQUEST_ACCEPT' |
        'RESPONSE_EXAMPLE' |
        'RESPONSE_DESCRIPTION' |
        'REQUEST_CONSUMES' |
        'RESPONSE_PRODUCES' |
        'SWAGGER_HIDDEN'
        ;

    export type MethodHttpVerbType =
        'ALL' |
        'GET' |
        'POST' |
        'PUT' |
        'DELETE' |
        'PATCH' |
        'OPTIONS' |
        'HEAD';

    export type MethodType =
        'METHOD_PATH' |
        MethodHttpVerbType |
        MethodAndCLassType
        ;

    export type ParameterType =
        ParameterServerType |
        'IS_INT' |
        'IS_LONG' |
        'IS_FlOAT' |
        'IS_DOUBLE'
        ;

    export type ParameterServerType =
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

    export type Type = ClassType | MethodType | ParameterType;

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
         * Default: 'one'
         */
        amount?: 'one' | 'all';
        /**
         * Default: 0
         */
        position?: number;
    }

    // -------------------------------------------

    export type Representation = Record<Type, RepresentationConfig | RepresentationConfig[]>;
    export interface RepresentationConfig {
        id: string;
        decorator?: DecoratorData;
        decorators?: DecoratorData[];
        properties?: Property[];
    }

    export type ConfigLibrary =
        Library |
        Library[] |
        Record<
            Library,
            Type[] | Type | Record<Type, boolean>
            >;

    export interface Config {
        useLibrary?: ConfigLibrary;
        useBuildIn?: boolean | Type[] | Record<Type, boolean> | Type;
        override?: Representation;
    }

    // -------------------------------------------
    

    
    const handlerCache : Partial<Record<Type, RepresentationManager>> = {};

    function toManyRepresentation(representation: RepresentationConfig | RepresentationConfig[]) : RepresentationConfig[] {
        return Array.isArray(representation) ? representation : [representation];
    }

    export function getRepresentationHandler(id: Type, map?: Config) : RepresentationManager {
        let value : RepresentationConfig[] = [];
        
        if(hasOwnProperty(handlerCache, id)) {
            return handlerCache[id];
        }
        
        if(typeof map === 'undefined' || typeof map.override === 'undefined' || !hasOwnProperty(map.override, id)) {
            const libraries : Library[] = [
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

        const resolver = new RepresentationManager(id, value);

        handlerCache[id] = resolver;

        return resolver;
    }
}
