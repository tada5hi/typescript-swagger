import {Resolver} from "./resolver/type";

export interface Metadata {
    controllers: Controller[];
    referenceTypes: { [typeName: string]: Resolver.ReferenceType };
}

export interface Method {
    deprecated?: boolean;
    description: string;
    method: string;
    name: string;
    parameters: Parameter[];
    path: string;
    type: Resolver.BaseType;
    tags: string[];
    responses: ResponseType[];
    security?: Security[];
    summary?: string;
    consumes: string[];
    produces: string[];
}

export interface Controller {
    location: string;
    methods: Method[];
    name: string;
    path: string;
    consumes: string[];
    produces: string[];
    responses: ResponseType[];
    tags: string[];
    security?: Security[];
}

export interface Parameter {
    parameterName: string;
    description: string;
    in: string;
    name: string;
    required: boolean;
    type: Resolver.BaseType;
    collectionFormat?: boolean;
    allowEmptyValue?: boolean;
    default?: any;
    maxItems?: number;
    minItems?: number;
}

export interface Security {
    name: string;
    scopes?: string[];
}

export interface ResponseType {
    description: string;
    status: string;
    schema?: Resolver.BaseType;
    examples?: any;
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
}

export interface ResponseData {
    status: string;
    type: Resolver.BaseType;
}
