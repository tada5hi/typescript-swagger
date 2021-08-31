import {Decorator} from "../../../type";

export const InternalMapping: Decorator.TypeRepresentationMapping = {
    // Class
    SWAGGER_TAGS: {
        id: 'SwaggerTags',
        properties: [{amount: 'all', declaredAs: "argument"}]
    },

    // Class + Method
    RESPONSE_EXAMPLE: {
        id: 'ResponseExample',
        properties: [
            {type: "TYPE", declaredAs: "typeArgument"},
            {type: "PAYLOAD", declaredAs: "argument"}
        ]
    },
    RESPONSE_DESCRIPTION: {
        id: 'ResponseDescription',
        properties: [
            {type: "TYPE", declaredAs: "typeArgument"},
            {type: "STATUS_CODE", declaredAs: "argument", position: 0},
            {type: "DESCRIPTION", declaredAs: "argument", position: 1},
            {type: "PAYLOAD", declaredAs: "argument", position: 2}
        ]
    },
    REQUEST_CONSUMES: {
        id: 'RequestConsumes',
        properties: [{amount: 'all', declaredAs: "argument"}]
    },
    RESPONSE_PRODUCES: {
        id: 'ResponseProduces',
        properties: [{amount: 'all', declaredAs: "argument"}]
    },
    SWAGGER_HIDDEN: {
        id: 'SwaggerHidden',
        properties: []
    },

    IS_INT: {
        id: 'IsInt',
        properties: []
    },
    IS_LONG: {
        id: 'IsLong',
        properties: []
    },
    IS_FlOAT: {
        id: 'IsFloat',
        properties: []
    },
    IS_DOUBLE: {
        id: 'IsDouble',
        properties: []
    },

    SERVER_FILES_PARAM: {
        id: 'RequestFileParam',
        properties: [{}]
    },
    SERVER_FILE_PARAM: {
        id: 'RequestFileParam',
        properties: [{}]
    },
} as Decorator.TypeRepresentationMapping;
