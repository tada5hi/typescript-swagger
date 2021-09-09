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

    export interface Config {
        /**
         * Support the output to be an yaml file
         */
        yaml?: boolean;

        /**
         * Generated swagger.{json|yaml} will output here
         */
        outputDirectory?: string;

        /**
         * Generated documentation base file name. Default: swagger
         */
        outputFileName?: string;

        /**
         * Inform if the generated spec will be in swagger 2.0 format or i open api 3.0
         */
        outputFormat?: Specification;

        /**
         * API host, expressTemplate.g. localhost:3000 or https://myapi.com
         */
        host?: string;

        /**
         * API version number; defaults to npm package version
         */
        version?: string;

        /**
         * API name; defaults to npm package name
         */
        name?: string;

        /**
         * 'API description; defaults to npm package description
         */
        description?: string;

        /**
         * API license; defaults to npm package license
         */
        license?: string;

        /**
         * Base API path; e.g. the 'v1' in https://myapi.com/v1
         */
        basePath?: string;

        /**
         * Extend generated swagger spec with this object
         * Note that generated properties will always take precedence over what get specified here
         */
        spec?: Record<string, any>;

        /**
         * Security Definitions Object
         * A declaration of the security schemes available to be used in the
         * specification. This does not enforce the security schemes on the operations
         * and only serves to provide the relevant details for each scheme.
         */
        securityDefinitions?: SecurityDefinitions;

        /**
         * Default consumes property for the entire API
         */
        consumes?: string[];

        /**
         * Default produces property for the entire API
         */
        produces?: string[];

        /**
         * Default collectionFormat property for query parameters of array type.
         * Possible values are `csv`, `ssv`, `tsv`, `pipes`, `multi`. If not specified, Swagger defaults to `csv`.
         */
        collectionFormat?: string;
    }

    export enum Specification {
        VERSION_2 = "VERSION_2",
        VERSION_3 = "VERSION_3"
    }

    export interface SecurityDefinitions {
        [key: string]: SecurityDefinition;
    }

    export type SecurityDefinition = ApiKeySecurity | BasicSecurity | OAuth2Security;

    export type SecurityType = 'apiKey' | 'http' | 'oauth2';

    export interface BaseSecurity {
        description?: string;
    }

    export interface ApiKeySecurity extends BaseSecurity {
        type: 'apiKey';
        name: string;
        in: 'query' | 'header';
    }

    export interface BasicSecurity extends BaseSecurity {
        type: 'http';
        schema: 'basic';
    }

    export interface OAuth2Security extends BaseSecurity {
        type: 'oauth2';
        flows: {
            implicit?: OAuth2ImplicitFlow,
            password?: OAuth2PasswordFlow,
            authorizationCode?: OAuth2AuthorizationCodeFlow,
            clientCredentials?: OAuth2ClientCredentialsFlow
        };
    }

    export interface Oauth2BaseFlow {
        scopes?: Record<string, string>;
        refreshUrl?: string;
    }

    export interface OAuth2ImplicitFlow extends Oauth2BaseFlow {
        authorizationUrl: string;
    }

    export interface OAuth2PasswordFlow extends Oauth2BaseFlow {
        tokenUrl: string;
    }

    export interface OAuth2AuthorizationCodeFlow extends Oauth2BaseFlow {
        authorizationUrl: string;
        tokenUrl: string;
    }

    export interface OAuth2ClientCredentialsFlow extends Oauth2BaseFlow {
        tokenUrl: string;
    }
}
