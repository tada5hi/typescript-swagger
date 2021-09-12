import {Resolver} from "./resolver/type";

export namespace Metadata {
    export interface Config {
        /**
         * The entry point to your API
         */
        entryFile: string | string[];

        /**
         * Directory to ignore during TypeScript metadata scan.
         */
        ignore?: string[];

        /**
         * Directory to store and cache metadata cache files.
         */
        cache?: string | boolean;
    }

    export interface Output {
        controllers: Controller[];
        referenceTypes: Resolver.ReferenceTypes;
    }

    export interface Controller {
        location: string;
        methods: Metadata.Method[];
        name: string;
        path: string;
        consumes: string[];
        produces: string[];
        responses: Response[];
        tags: string[];
        security?: Security[];
    }

    export interface Security {
        name: string;
        scopes?: string[];
    }

    export type MethodType = 'get' | 'post' | 'put' | 'delete' | 'options' | 'head' | 'patch';

    export interface Method {
        operationId?: string;
        deprecated?: boolean;
        description: string;
        method: MethodType;
        extensions: Extension[];
        name: string;
        parameters: Parameter[];
        path: string;
        type: Resolver.BaseType;
        tags: string[];
        responses: Response[];
        security?: Security[];
        summary?: string;
        consumes: string[];
        produces: string[];
        // todo: check assignment
        isHidden: boolean;
    }

    export interface Extension {
        key: string;
        value: ExtensionType | ExtensionType[];
    }

    export type ExtensionType = string | number | boolean | null | ExtensionType[] | { [name: string]: ExtensionType | ExtensionType[] };

    export interface Parameter {
        parameterName: string;
        description: string;
        in: string;
        name: string;
        required: boolean;
        type: Resolver.BaseType;
        collectionFormat?: 'csv' | 'multi' | 'pipes' | 'ssv' | 'tsv';
        allowEmptyValue?: boolean;
        default?: any;
        maxItems?: number;
        minItems?: number;
        deprecated?: boolean;

        example?: unknown[];
        validators?: Record<string, Validator>;
    }

    export interface ArrayParameter extends Parameter {
        type: Resolver.ArrayType;
    }

    export interface Validator {
        [key: string]: {
            value?: unknown,
            message?: string
        };
    }

    export interface Property {
        default?: any;
        format?: string;
        example?: unknown;
        validators?: Record<string, { value?: any, message?: string }>;
        description?: string;
        name: string;
        type: Resolver.Type;
        required: boolean;
        deprecated: boolean;
    }

    export interface Response {
        // todo: add in metadata generation
        name: string;
        headers?: Resolver.NestedObjectLiteralType | Resolver.RefObjectType;

        description: string;
        status: string;
        schema?: Resolver.BaseType;
        examples?: unknown[] | unknown;
    }

    export interface ResponseData {
        status: string;
        type: Resolver.BaseType;
    }
}






