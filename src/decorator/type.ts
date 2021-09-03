export namespace Decorator {
    export interface Data {
        text: string;
        arguments: any[];
        typeArguments: any[];
    }


    /**
     * A decorator type is an identifier which is associated
     * to specific decorator names.
     */

    export type ClassType =
        'SWAGGER_TAGS' |
        'CLASS_PATH' |
        MethodAndCLassType
        ;

    export type MethodAndCLassType =
        'REQUEST_ACCEPT' |
        'RESPONSE_EXAMPLE' |
        'RESPONSE_DESCRIPTION' |
        'REQUEST_CONSUMES' |
        'RESPONSE_PRODUCES' |
        'HIDDEN' |
        'EXTENSION'
        ;

    export type MethodHttpVerbType =
        'ALL' |
        'GET' |
        'POST' |
        'PUT' |
        'DELETE' |
        'PATCH' |
        'OPTIONS' |
        'HEAD';

    export type MethodType =
        'METHOD_PATH' |
        'DEPRECATED' |
        MethodHttpVerbType |
        MethodAndCLassType
        ;

    export type ParameterType =
        ParameterServerType |
        'IS_INT' |
        'IS_LONG' |
        'IS_FlOAT' |
        'IS_DOUBLE'
        ;

    export type ParameterServerType =
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

    export type Type = ClassType | MethodType | ParameterType;

    // -------------------------------------------

    export type PropertyType = 'PAYLOAD' | 'STATUS_CODE' | 'DESCRIPTION' /* | 'PATH' | 'MEDIA_TYPE' | 'KEY' */ | 'OPTIONS' | 'SIMPLE' | 'TYPE';
    export interface Property {
        /**
         * Default: 'SIMPLE'
         */
        type?: PropertyType;
        /**
         * Default: 'argument'
         */
        declaredAs?: 'argument' | 'typeArgument';
        /**
         * Default: 'one'
         */
        amount?: 'one' | 'all';
        /**
         * Default: 0
         */
        position?: number;
    }

    export interface PropertyItem {
        type: 'array' | 'element';
        srcArgumentType: 'argument' | 'typeArgument';
        srcPosition?: number;
        srcAmount?: number;
        srcStrategy?: 'merge' | 'none';
    }

    // -------------------------------------------

    export type Library = 'typescript-rest' | '@decorators/express';

    // -------------------------------------------

    export type ConfigMappingOption = boolean | Type | Type[] | Record<Type, boolean>;

    export type TypeRepresentationMapping = Record<Type, Representation | Representation[]>;

    export interface Representation {
        id: string;
        properties?: Property[];
    }

    export type ConfigLibrary =
        Library |
        Library[] |
        Record<Library, ConfigMappingOption>;

    export interface Config {
        useLibrary?: ConfigLibrary;
        useBuildIn?: ConfigMappingOption;
        override?: TypeRepresentationMapping;
    }
}
