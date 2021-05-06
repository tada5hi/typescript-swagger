import {hasOwnProperty} from "../metadata/resolver/utils";
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

    // -------------------------------------------

    export type Representation = Record<ID, string | Array<string>>;

    export interface Config {
        useLibrary?: Library | Array<Library> | Record<Library, ID> | Record<Library, Representation>;
        useBuildIn?: boolean | Array<ID> | ID;
        override?: Representation;
    }

    // -------------------------------------------
    

    
    const idRepresentationCache : Partial<Record<ID, Array<string>>> = {};

    function toManyRepresentation(representation: string | Array<string>) : Array<string> {
        return Array.isArray(representation) ? representation : [representation];
    }

    export function getIDRepresentation(id: ID, map?: Config) : string {
        const values = getIDRepresentations(id, map);

        if(values.length === 0) {
            throw new Error('The ID '+id+' is not valid identifier for a supported decorator.');
        }

        // Return first found representation
        return values[0];
    }

    export function getIDRepresentations(id: ID, map?: Config) : Array<string> {
        let value : Array<string> = [];
        
        if(hasOwnProperty(idRepresentationCache, id)) {
            return idRepresentationCache[id];
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

            idRepresentationCache[id] = value;
            
            return value;
        }

        return toManyRepresentation(map.override[id]);
    }
}
