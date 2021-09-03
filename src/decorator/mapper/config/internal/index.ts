import {Decorator} from "../../../type";

export const InternalMapping: Partial<Decorator.TypeRepresentationMap> = {
    EXTENSION: {
        id: 'Extension',
        properties: {
            KEY: {type: "element", srcArgumentType: "argument", srcPosition: 0},
            VALUE: {type: "element", srcArgumentType: "argument", srcPosition: 1}
        }
    },

    // Class
    SWAGGER_TAGS: {
        id: 'SwaggerTags',
        properties: {
            DEFAULT: {type: 'array', srcArgumentType: "argument"}
        }
    },

    // Class + Method
    RESPONSE_EXAMPLE: {
        id: 'ResponseExample',
        properties: {
            TYPE: {type: "element", srcArgumentType: "typeArgument"},
            PAYLOAD: {type: "src", srcArgumentType: "argument"}
        }
    },
    RESPONSE_DESCRIPTION: {
        id: 'ResponseDescription',
        properties: {
            TYPE: {type: "element", srcArgumentType: "typeArgument"},
            STATUS_CODE: {type: "element", srcArgumentType: "argument", srcPosition: 0},
            DESCRIPTION: {type: "element", srcArgumentType: "argument", srcPosition: 1},
            PAYLOAD: {type: "src", srcArgumentType: "argument", srcPosition: 2}
        }
    },
    REQUEST_CONSUMES: {
        id: 'RequestConsumes',
        properties: {
            DEFAULT: {type: 'array', srcArgumentType: "argument", srcAmount: -1, srcArrayStrategy: "merge"}
        }
    },
    RESPONSE_PRODUCES: {
        id: 'ResponseProduces',
        properties: {
            DEFAULT: {type: 'array', srcArgumentType: "argument", srcAmount: -1, srcArrayStrategy: "merge"}
        }
    },
    HIDDEN: {
        id: 'SwaggerHidden',
        properties: []
    },

    DEPRECATED: {
        id: 'Deprecated',
        properties: undefined
    },

    IS_INT: {
        id: 'IsInt',
        properties: undefined
    },
    IS_LONG: {
        id: 'IsLong',
        properties: undefined
    },
    IS_FlOAT: {
        id: 'IsFloat',
        properties: undefined
    },
    IS_DOUBLE: {
        id: 'IsDouble',
        properties: undefined
    },

    SERVER_FILES_PARAM: {
        id: 'RequestFileParam',
        properties: {
            DEFAULT: {}
        }
    },
    SERVER_FILE_PARAM: {
        id: 'RequestFileParam',
        properties: {
            DEFAULT: {}
        }
    },
};
