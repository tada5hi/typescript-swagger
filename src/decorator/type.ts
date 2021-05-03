import {hasOwnProperty} from "../metadata/resolver/utils";
import {findBuildInKeyRepresentation, isBuildInIncluded} from "./build-in";
import {findLibraryKeyRepresentation, isLibraryIncluded, Library} from "./library";

export namespace Decorator {
    export type ClassKey =
        'TAGS' |
        'CLASS_PATH' |
        MethodAndCLassKey
        ;

    export type MethodAndCLassKey =
        'REQUEST_ACCEPT' |
        'RESPONSE_EXAMPLE' |
        'RESPONSE_DESCRIPTION' |
        'CONSUMES' |
        'PRODUCES' |
        'HIDDEN'
        ;

    export type MethodHttpVerbKey =
        'ALL' |
        'GET' |
        'POST' |
        'PUT' |
        'DELETE' |
        'PATCH' |
        'OPTIONS' |
        'HEAD';

    export type MethodKey =
        'METHOD_PATH' |
        MethodHttpVerbKey |
        MethodAndCLassKey
        ;

    export type ParameterKey =
        ParameterServerKey |
        'IS_INT' |
        'IS_LONG' |
        'IS_FlOAT' |
        'IS_DOUBLE'
        ;

    export type ParameterServerKey =
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

    export type Key = ClassKey | MethodKey | ParameterKey;

    // -------------------------------------------

    export type RepresentationItem = Record<Key, string | Array<string>>;

    export interface Representation {
        useLibrary?: Library | Array<Library> | Record<Library, Key> | Record<Library, RepresentationItem>;
        useBuildIn?: boolean | Array<Key> | Key;
        override?: RepresentationItem;
    }

    // -------------------------------------------
    

    
    const keyValueCache : Partial<Record<Key, Array<string>>> = {};

    function toManyRepresentation(representation: string | Array<string>) : Array<string> {
        return Array.isArray(representation) ? representation : [representation];
    }

    export function getKeyRepresentation(key: Key, map?: Representation) : string {
        const keys = getKeyRepresentations(key, map);

        if(keys.length === 0) {
            throw new Error('The key '+key+' is not valid identifier for a supported decorator.');
        }

        // Return first found representation
        return keys[0];
    }

    export function getKeyRepresentations(key: Key, map?: Representation) : Array<string> {
        let value : Array<string> = [];
        
        if(hasOwnProperty(keyValueCache, key)) {
            return keyValueCache[key];
        }
        
        if(typeof map === 'undefined' || typeof map.override === 'undefined' || !hasOwnProperty(map.override, key)) {
            const libraries : Array<Library> = [
                "@decorators/express", 
                "typescript-rest"
            ];
            
            for(let i=0; i<libraries.length; i++) {
                if(!isLibraryIncluded(libraries[i], map)) {
                    continue; 
                }

                const currentValue = findLibraryKeyRepresentation(libraries[i], key, map);

                if(typeof currentValue !== 'undefined') {
                    value = [...value, ...toManyRepresentation(currentValue)];
                }
            }

            if(isBuildInIncluded(map, key)) {
                const buildInValue = findBuildInKeyRepresentation(key);
                if(typeof buildInValue !== 'undefined') {
                    value = [...value, ...toManyRepresentation(buildInValue)];
                }
            }

            keyValueCache[key] = value;
            
            return value;
        }

        return toManyRepresentation(map.override[key]);
    }
}
