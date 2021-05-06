import {hasOwnProperty} from "../../metadata/resolver/utils";
import {Decorator} from "../type";

export const BuildInMap : Decorator.Representation = {
    // Class
    /**
     * @SwaggerTags('abc', 'def', ...)
     * class Entity {
     *
     * }
     *
     * Add the api endpoint to one or many swagger tag(s).
     */
    SWAGGER_TAGS: 'SwaggerTags',

    /**
     * @Path('/path')
     * class Entity {
     *
     * }
     *
     * Define the base path for implemented methods.
     */
    CLASS_PATH: undefined,

    // Class + Method
    REQUEST_ACCEPT: 'RequestAccept',
    RESPONSE_EXAMPLE: 'ResponseExample',
    RESPONSE_DESCRIPTION: 'ResponseDescription',
    REQUEST_CONSUMES: 'RequestConsumes',
    RESPONSE_PRODUCES: 'ResponseProduces',
    SWAGGER_HIDDEN: 'SwaggerHidden',

    // Method
    ALL: undefined,
    GET: undefined,
    POST: undefined,
    PUT: undefined,
    DELETE: undefined,
    PATCH: undefined,
    OPTIONS: undefined,
    HEAD: undefined,

    /**
     * @Path('/path')
     * getMany() {
     *     return [];
     * }
     *
     * Define the method path (in addition to the base path provided by the class).
     */
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

    IS_INT: 'IsInt',
    IS_LONG: 'IsLong',
    IS_FlOAT: 'IsFloat',
    IS_DOUBLE: 'IsDouble'
};

export function isBuildInIncluded(map?: Decorator.Config, id?: Decorator.ID) {
    if(typeof map === 'undefined' || typeof map.useBuildIn === 'undefined') {
        // Build in is always included by default.
        return true;
    }

    const useLibraryType = Object.prototype.toString.call(map.useBuildIn);
    switch (useLibraryType) {
        case '[object Boolean]':
            return map.useBuildIn;
        case '[object String]':
            return map.useBuildIn === id;
        case '[object Array]':
            return (map.useBuildIn as Array<Decorator.ID>).indexOf(id) !== -1;
    }

    return true;
}

export function findBuildInIDRepresentation(id: Decorator.ID, map?: Decorator.Config) : string | Array<string> | undefined {
    if(typeof map === 'undefined') {
        return findRepresentationInBuildIn(id);
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
            return (map.useBuildIn as Decorator.ID) === id ? findRepresentationInBuildIn(id) : undefined;
        case '[object Array]':
            return (map.useBuildIn as Array<Decorator.ID>).indexOf(id) !== -1 ? findRepresentationInBuildIn(id) : undefined;
    }

    return findRepresentationInBuildIn(id);
}

export function findRepresentationInBuildIn(key: Decorator.ID) : string | Array<string> | undefined {

    if(hasOwnProperty(BuildInMap, key)) {
        return BuildInMap[key];
    }

    return undefined;
}
