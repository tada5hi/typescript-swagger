export namespace Swagger {
    export type DataType = 'void' | 'integer' | 'number' | 'boolean' | 'string' | 'array' | 'object' | 'file';

    export type DataFormat = 'int32' | 'int64' | 'float' | 'double' | 'byte' | 'binary' | 'date' | 'date-time' | 'password';

    export type Protocol = 'http' | 'https' | 'ws' | 'wss';

    export interface BaseSpec {
        info: Info;
        tags?: Tag[];
        externalDocs?: ExternalDocs;
    }

    export interface Info {
        title: string;
        version: string;
        description?: string;
        termsOfService?: string;
        contact?: Contact;
        license?: License;
    }

    export interface Contact {
        name?: string;
        email?: string;
        url?: string;
    }

    export interface License {
        name: string;
        url?: string;
    }

    export interface ExternalDocs {
        url: string;
        description?: string;
    }

    export interface Tag {
        name: string;
        description?: string;
        externalDocs?: ExternalDocs;
    }

    export interface Examples {
        examples?: Record<string, Example>;
    }

    export interface Example {
        value: unknown | unknown[];
        summary?: string;
        description?: string;
    }

    export interface BaseParameter<T> {
        name: string;
        in: ParameterInType;
        required?: boolean;
        description?: string;
        example?: unknown;
        examples?: Record<string, Example | string>;
        schema: BaseSchema<T>;
        type?: DataType;
        format?: DataFormat;
        deprecated?: boolean;
    }

    export interface BodyParameter<T> extends BaseParameter<T> {
        in: 'body';
    }

    export interface QueryParameter<T> extends BaseParameter<T> {
        in: 'query';
        allowEmptyValue?: boolean;
        collectionFormat?: CollectionFormat;
    }

    export interface PathParameter<T> extends BaseParameter<T> {
        in: 'path';
    }

    export interface HeaderParameter<T> extends BaseParameter<T> {
        in: 'header';
    }

    export interface FormDataParameter<T> extends BaseParameter<T> {
        in: 'formData';
        collectionFormat?: CollectionFormat;
    }

    export type CollectionFormat = 'csv' | 'ssv' | 'tsv' | 'pipes' | 'multi';

    export type ParameterInType = 'query' | 'header' | 'path' | 'formData' | 'body';

    export type Parameter<T> =
        BodyParameter<T> |
        FormDataParameter<T> |
        QueryParameter<T> |
        PathParameter<T> |
        HeaderParameter<T>;

    export interface BaseOperation<P, R, S> {
        responses: { [name: string]: R };
        summary?: string;
        description?: string;
        externalDocs?: ExternalDocs;
        operationId?: string;
        consumes?: string[];
        parameters?: P[];
        schemes?: string[];
        deprecated?: boolean;
        security?: S[];
        tags?: string[];
    }

    export interface BaseResponse {
        description: string;
    }

    export interface BaseSchema<T> {
        type?: DataType | any;
        format?: DataFormat;
        title?: string;
        description?: string;
        default?: string | boolean | number | any;
        multipleOf?: number;
        maximum?: number;
        exclusiveMaximum?: number;
        minimum?: number;
        exclusiveMinimum?: number;
        maxLength?: number;
        minLength?: number;
        pattern?: string;
        maxItems?: number;
        minItems?: number;
        uniqueItems?: boolean;
        maxProperties?: number;
        minProperties?: number;
        enum?: Array<string | number>;
        'x-enum-varnames'?: string[];
        items?: T | BaseSchema<T> | any;
        additionalProperties?: boolean | { [ref: string]: string } | T;
        properties?: { [propertyName: string]: T };
        discriminator?: string;
        readOnly?: boolean;
        xml?: XML;
        externalDocs?: ExternalDocs;
        example?: { [exampleName: string]: Example } | unknown;
        required?: string[];
        $ref?: string;
    }

    export interface XML {
        type?: string;
        namespace?: string;
        prefix?: string;
        attribute?: string;
        wrapped?: boolean;
    }

    export interface BaseSecurity {
        description?: string;
    }

    export interface ApiKeySecurity extends BaseSecurity {
        type: 'apiKey';
        name: string;
        in: 'query' | 'header';
    }

    // tslint:disable-next-line:no-shadowed-variable
    export interface Path<Operation, Parameter> {
        $ref?: string;
        get?: Operation;
        put?: Operation;
        post?: Operation;
        delete?: Operation;
        options?: Operation;
        head?: Operation;
        patch?: Operation;
        parameters?: Parameter[];
    }
}
