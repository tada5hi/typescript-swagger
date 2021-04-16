import {Property} from "../metadataGenerator";

export namespace ResolverType {
    export interface BaseType {
        typeName: string;
        typeArgument?: BaseType;
    }

    export interface EnumerateType extends BaseType {
        enumMembers: Array<string>;
    }

    export interface IntersectionType extends BaseType {
        enumMembers: Array<any>;
    }

    export interface ReferenceType extends BaseType {
        description: string;
        properties: Array<Property>;
        additionalProperties?: Array<Property>;
    }

    export interface ObjectType extends BaseType {
        properties: Array<Property>;
    }

    export interface ArrayType extends BaseType {
        elementType: BaseType;
    }
}


