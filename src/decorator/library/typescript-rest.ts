import {Decorator} from "../type";

export namespace TypescriptRestLibrary {
    export const DecoratorRepresentations : Partial<Decorator.Representation> = {
        // Class
        CLASS_PATH: {
            name: 'Path',
            properties: [{amount: 'one', declaredAs: "argument"}]
        },

        // Class + Method
        REQUEST_ACCEPT: undefined,
        RESPONSE_EXAMPLE: {
            name: 'Example',
            properties: [
                {type: "TYPE", declaredAs: "typeArgument"},
                {type: "PAYLOAD", declaredAs: "argument"}
            ]
        },
        RESPONSE_DESCRIPTION: {
            name: 'Response',
            properties: [
                {type: "TYPE", declaredAs: "typeArgument"},
                {type: "STATUS_CODE", declaredAs: "argument", position: 0},
                {type: "DESCRIPTION", declaredAs: "argument", position: 1},
                {type: "PAYLOAD", declaredAs: "argument", position: 2}
            ]
        },

        // Method
        ALL: {
            name: 'ALL',
            properties: []
        },
        GET: {
            name: 'GET',
            properties: []
        },
        POST: {
            name: 'POST',
            properties: []
        },
        PUT: {
            name: 'PUT',
            properties: []
        },
        DELETE: {
            name: 'DELETE',
            properties: []
        },
        PATCH: {
            name: 'PATCH',
            properties: []
        },
        OPTIONS: {
            name: 'OPTIONS',
            properties: []
        },
        HEAD: {
            name: 'HEAD',
            properties: []
        },

        METHOD_PATH: {
            name: 'Path',
            properties: [{amount: 'one', declaredAs: "argument"}]
        },

        // Parameter
        SERVER_CONTEXT: [
            {
                name: 'Context',
            },
            {
                name: 'ContextRequest',
            },
            {
                name: 'ContextResponse',
            },
            {
                name: 'ContextNext',
            },
            {
                name: 'ContextLanguage',
            },
            {
                name: 'ContextAccept',
            }
        ],
        SERVER_PARAMS: {
            name: 'Param',
            properties: [{}]
        },
        SERVER_QUERY: {
            name: 'QueryParam',
            properties: [{}]
        },
        SERVER_FORM: {
            name: 'FormParam',
            properties: [{}]
        },
        SERVER_BODY: undefined,
        SERVER_HEADERS: {
            name: 'HeaderParam',
            properties: [{}]
        },
        SERVER_COOKIES: {
            name: 'CookieParam',
            properties: [{}]
        },
        SERVER_PATH_PARAMS: {
            name: 'PathParam',
            properties: [{}]
        },
        SERVER_FILES_PARAM: {
            name: 'FilesParam',
            properties: [{}]
        },
        SERVER_FILE_PARAM: {
            name: 'FileParam',
            properties: [{}]
        },
    };
}
