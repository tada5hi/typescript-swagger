import {Decorator} from "../type";

export namespace TypescriptRestLibrary {
    export const DecoratorRepresentations : Decorator.Representation = {
        // Class
        SWAGGER_TAGS: undefined,
        CLASS_PATH: 'Path',

        // Class + Method
        REQUEST_ACCEPT: undefined,
        RESPONSE_EXAMPLE: 'Example',
        RESPONSE_DESCRIPTION: 'Response',
        REQUEST_CONSUMES: undefined,
        RESPONSE_PRODUCES: undefined,
        SWAGGER_HIDDEN: undefined,

        // Method
        ALL: 'ALL',
        GET: 'GET',
        POST: 'POST',
        PUT: 'PUT',
        DELETE: 'DELETE',
        PATCH: 'PATCH',
        OPTIONS: 'OPTIONS',
        HEAD: 'HEAD',

        METHOD_PATH: 'Path',

        // Parameter
        SERVER_CONTEXT: [
            'Context',
            'ContextRequest',
            'ContextResponse',
            'ContextNext',
            'ContextLanguage',
            'ContextAccept'
        ],
        SERVER_PARAMS: [
            'Param'
        ],
        SERVER_QUERY: 'QueryParam',
        SERVER_FORM: 'FormParam',
        SERVER_BODY: undefined,
        SERVER_HEADERS: 'HeaderParam',
        SERVER_COOKIES: 'CookieParam',
        SERVER_PATH_PARAMS: 'PathParam',
        SERVER_FILES_PARAM: 'FilesParam',
        SERVER_FILE_PARAM: 'FileParam',

        IS_INT: 'IsInt',
        IS_LONG: 'IsLong',
        IS_FlOAT: 'IsFloat',
        IS_DOUBLE: 'IsDouble'
    };
}
