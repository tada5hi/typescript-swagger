import {Decorator} from "../../type";

export namespace DecoratorExpressLibrary {
    export const DecoratorRepresentations : Decorator.RepresentationItem = {
        // Class
        TAGS: undefined,
        CLASS_PATH: 'Controller',

        // Class + Method
        REQUEST_ACCEPT: undefined,
        RESPONSE_EXAMPLE: undefined,
        RESPONSE_DESCRIPTION: undefined,
        CONSUMES: undefined,
        PRODUCES: undefined,
        HIDDEN: undefined,

        // Method
        ALL: 'All',
        GET: 'Get',
        POST: 'Post',
        PUT: 'Put',
        DELETE: 'Delete',
        PATCH: 'Patch',
        OPTIONS: 'Options',
        HEAD: 'Head',

        METHOD_PATH: [
            'All',
            'Get',
            'Post',
            'Put',
            'Delete',
            'Patch',
            'OPTIONS',
            'Head'
        ],

        // Parameter
        SERVER_CONTEXT: [
            'Request',
            'Response',
            'Next'
        ],
        SERVER_PARAMS: undefined,
        SERVER_QUERY: 'Query',
        SERVER_FORM: undefined,
        SERVER_BODY: 'Body',
        SERVER_HEADERS: 'Headers',
        SERVER_COOKIES: 'Cookies',
        SERVER_PATH_PARAMS: 'Params',
        SERVER_FILES_PARAM: undefined,
        SERVER_FILE_PARAM: undefined,

        IS_INT: undefined,
        IS_LONG: undefined,
        IS_FlOAT: undefined,
        IS_DOUBLE: undefined
    };
}
