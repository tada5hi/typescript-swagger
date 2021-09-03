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

    export interface TypePropertyMaps {
        // Class Type
        SWAGGER_TAGS: {
            DEFAULT: string[]
        };
        CLASS_PATH: {
            DEFAULT: string
        };

        // Method and Class
        REQUEST_ACCEPT: undefined;
        RESPONSE_EXAMPLE: {
            TYPE: unknown,
            PAYLOAD: unknown | unknown[]
        };
        RESPONSE_DESCRIPTION: {
            TYPE: unknown;
            STATUS_CODE: number | string;
            DESCRIPTION: string;
            PAYLOAD: unknown | unknown[];
        };
        REQUEST_CONSUMES: {
            DEFAULT: string[]
        };
        RESPONSE_PRODUCES: {
            DEFAULT: string[]
        };
        HIDDEN: {};
        EXTENSION: {
            KEY: string,
            VALUE: unknown | unknown[]
        };

        // Method
        METHOD_PATH: {
            DEFAULT: string
        };
        DEPRECATED: undefined;

        // METHOD HTTP
        ALL: {
            DEFAULT?: string
        };
        GET: {
            DEFAULT?: string
        };
        POST: {
            DEFAULT?: string
        };
        PUT: {
            DEFAULT?: string
        };
        DELETE: {
            DEFAULT?: string
        };
        PATCH: {
            DEFAULT?: string
        };
        OPTIONS: {
            DEFAULT?: string
        };
        HEAD: {
            DEFAULT?: string
        };

        // Parameter
        IS_INT: undefined;
        IS_LONG: undefined;
        IS_FlOAT: undefined;
        IS_DOUBLE: undefined;

        // Parameter Server
        SERVER_CONTEXT: {};
        SERVER_PARAMS: {
            // typescript-rest
            DEFAULT?: string
        };
        SERVER_QUERY: {
            // typescript-rest
            DEFAULT?: string,
            OPTIONS?: Record<string, any>
        } | undefined;
        SERVER_FORM: {
            // typescript-rest
            DEFAULT?: string
        } | undefined;
        SERVER_BODY: {
            // typescript-rest
            DEFAULT?: string
        };
        SERVER_HEADERS: {
            // typescript-rest
            DEFAULT?: string
        };
        SERVER_COOKIES: {
            // typescript-rest
            DEFAULT?: string
        };
        SERVER_PATH_PARAMS: {
            // typescript-rest
            DEFAULT?: string
        };
        SERVER_FILE_PARAM: {
            // typescript-rest
            DEFAULT?: string
        };
        SERVER_FILES_PARAM: {
            // typescript-rest
            DEFAULT?: string
        };
    }

    export type Type = keyof TypePropertyMaps;

    export type MethodHttpVerbType = Extract<Type, 'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE' |
        'PATCH' | 'OPTIONS' | 'HEAD'>;


    export type ParameterServerType = Extract<Type, 'SERVER_CONTEXT' | 'SERVER_PARAMS' | 'SERVER_QUERY' | 'SERVER_FORM' |
        'SERVER_BODY' | 'SERVER_HEADERS' | 'SERVER_COOKIES' | 'SERVER_PATH_PARAMS' |
        'SERVER_FILE_PARAM' | 'SERVER_FILES_PARAM'>;

    // -------------------------------------------

    export type PropertySrcType = 'src';
    export interface Property {
        /**
         * Default: 'element'
         */
        type?: 'element' | 'array' | PropertySrcType;

        /**
         * Default: 'argument'
         */
        srcArgumentType?: 'argument' | 'typeArgument';

        /**
         * Default: 0
         */
        srcPosition?: number;

        /**
         * Default: undefined
         */
        srcAmount?: number;

        /**
         * Default: 'none'
         */
        srcArrayStrategy?: 'merge' | 'none' | ((...items: unknown[][]) => unknown[]);

        /**
         *
         */
        srcObjectStrategy?: 'merge' | 'none' | ((...items: unknown[]) => unknown);
    }

    // -------------------------------------------
    // Record<Type, PropertyReturnValueTypeMap[Type]>
    export type TypeRepresentationMap = {
        [T in keyof TypePropertyMaps]: Representation<T> | Array<Representation<T>>;
    };

    export interface Representation<T extends keyof TypePropertyMaps> {
        id: string;
        properties?: RepresentationProperties<TypePropertyMaps[T]>;
    }

    export type RepresentationProperties<P> = {
        [K in keyof P]: Property
    };

    // -------------------------------------------

    export type Library = 'typescript-rest' | '@decorators/express';

    export type ConfigLibrary =
        Library |
        Library[] |
        Record<Library, ConfigMappingOption>;

    export interface Config {
        useLibrary?: ConfigLibrary;
        useBuildIn?: ConfigMappingOption;
        override?: TypeRepresentationMap;
    }

    export type ConfigMappingOption = boolean | Type | Type[] | Record<Type, boolean>;
}
