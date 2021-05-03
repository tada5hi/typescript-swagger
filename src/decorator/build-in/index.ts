import {hasOwnProperty} from "../../metadata/resolver/utils";
import {Decorator} from "../type";

export const BuildInMap : Decorator.RepresentationItem = {
    // Class
    TAGS: 'Tags',
    CLASS_PATH: undefined,

    // Class + Method
    REQUEST_ACCEPT: 'Accept',
    RESPONSE_EXAMPLE: 'ResponseExample',
    RESPONSE_DESCRIPTION: 'ResponseDescription',
    CONSUMES: 'Consumes',
    PRODUCES: 'Produces',
    HIDDEN: 'Hidden',

    // Method
    ALL: undefined,
    GET: undefined,
    POST: undefined,
    PUT: undefined,
    DELETE: undefined,
    PATCH: undefined,
    OPTIONS: undefined,
    HEAD: undefined,

    METHOD_PATH: undefined,

    // Parameter
    SERVER_CONTEXT: undefined,
    SERVER_PARAMS: undefined,
    SERVER_QUERY: undefined,
    SERVER_FORM: undefined,
    SERVER_BODY: 'ServerBody',
    SERVER_HEADERS: undefined,
    SERVER_COOKIES: undefined,
    SERVER_PATH_PARAMS: undefined,
    SERVER_FILES_PARAM: undefined,
    SERVER_FILE_PARAM: undefined,

    IS_INT: undefined,
    IS_LONG: undefined,
    IS_FlOAT: undefined,
    IS_DOUBLE: undefined
};

export function isBuildInIncluded(map?: Decorator.Representation, key?: Decorator.Key) {
    if(typeof map === 'undefined' || typeof map.useBuildIn === 'undefined') {
        // Build in is always included by default.
        return true;
    }

    const useLibraryType = Object.prototype.toString.call(map.useBuildIn);
    switch (useLibraryType) {
        case '[object Boolean]':
            return map.useBuildIn;
        case '[object String]':
            return map.useBuildIn === key;
        case '[object Array]':
            return (map.useBuildIn as Array<Decorator.Key>).indexOf(key) !== -1;
    }

    return true;
}

export function findBuildInKeyRepresentation(key: Decorator.Key, map?: Decorator.Representation) : string | Array<string> | undefined {
    if(typeof map === 'undefined') {
        return findRepresentationInBuildIn(key);
    }

    // check if library is included, if so check if library can provide representation.
    const useLibraryType = Object.prototype.toString.call(map.useBuildIn);
    switch (useLibraryType) {
        case '[object Boolean]':
            if(!map.useBuildIn) {
                return undefined;
            }
            break;
        case '[object String]':
            return (map.useBuildIn as Decorator.Key) === key ? findRepresentationInBuildIn(key) : undefined;
        case '[object Array]':
            return (map.useBuildIn as Array<Decorator.Key>).indexOf(key) !== -1 ? findRepresentationInBuildIn(key) : undefined;
    }

    return findRepresentationInBuildIn(key);
}

export function findRepresentationInBuildIn(key: Decorator.Key) : string | Array<string> | undefined {

    if(hasOwnProperty(BuildInMap, key)) {
        return BuildInMap[key];
    }

    return undefined;
}
