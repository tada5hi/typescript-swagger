import {Decorator} from "../../../../type";

export namespace TypescriptRestLibrary {
    export const DecoratorRepresentations: Decorator.TypeRepresentationMapping = {
        // Class
        CLASS_PATH: {
            id: 'Path',
            properties: [{amount: 'one', declaredAs: "argument"}]
        },

        // Class + Method
        REQUEST_ACCEPT: undefined,
        RESPONSE_EXAMPLE: {
            id: 'Example',
            properties: [
                {type: "TYPE", declaredAs: "typeArgument"},
                {type: "PAYLOAD", declaredAs: "argument"}
            ]
        },
        RESPONSE_DESCRIPTION: {
            id: 'Response',
            properties: [
                {type: "TYPE", declaredAs: "typeArgument"},
                {type: "STATUS_CODE", declaredAs: "argument", position: 0},
                {type: "DESCRIPTION", declaredAs: "argument", position: 1},
                {type: "PAYLOAD", declaredAs: "argument", position: 2}
            ]
        },

        // Method
        ALL: {
            id: 'ALL',
            properties: []
        },
        GET: {
            id: 'GET',
            properties: []
        },
        POST: {
            id: 'POST',
            properties: []
        },
        PUT: {
            id: 'PUT',
            properties: []
        },
        DELETE: {
            id: 'DELETE',
            properties: []
        },
        PATCH: {
            id: 'PATCH',
            properties: []
        },
        OPTIONS: {
            id: 'OPTIONS',
            properties: []
        },
        HEAD: {
            id: 'HEAD',
            properties: []
        },

        METHOD_PATH: {
            id: 'Path',
            properties: [{amount: 'one', declaredAs: "argument"}]
        },

        // Parameter
        SERVER_CONTEXT: [
            {
                id: 'Context',
            },
            {
                id: 'ContextRequest',
            },
            {
                id: 'ContextResponse',
            },
            {
                id: 'ContextNext',
            },
            {
                id: 'ContextLanguage',
            },
            {
                id: 'ContextAccept',
            }
        ],
        SERVER_PARAMS: {
            id: 'Param',
            properties: [{}]
        },
        SERVER_QUERY: {
            id: 'QueryParam',
            properties: [{}]
        },
        SERVER_FORM: {
            id: 'FormParam',
            properties: [{}]
        },
        SERVER_BODY: undefined,
        SERVER_HEADERS: {
            id: 'HeaderParam',
            properties: [{}]
        },
        SERVER_COOKIES: {
            id: 'CookieParam',
            properties: [{}]
        },
        SERVER_PATH_PARAMS: {
            id: 'PathParam',
            properties: [{}]
        },
        SERVER_FILES_PARAM: {
            id: 'FilesParam',
            properties: [{}]
        },
        SERVER_FILE_PARAM: {
            id: 'FileParam',
            properties: [{}]
        },
    } as Decorator.TypeRepresentationMapping;
}
