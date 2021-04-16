import {Property} from "../metadataGenerator";

export namespace ResolverType {
    export interface BaseType {
        typeName: string;
        typeArgument?: BaseType;
    }

    // -------------------------------------------

    export interface EnumerateType extends BaseType {
        enumMembers: Array<string>;
        typeName: 'enum';
    }

    export function isEnumerateType(param: BaseType) : param is ReferenceType {
        return param.typeName === 'enum';
    }

    // -------------------------------------------

    export interface IntersectionType extends BaseType {
        typeName: 'intersection';
        enumMembers: Array<any>;
    }

    export function isIntersectionType(param: BaseType) : param is ReferenceType {
        return param.typeName === 'intersection';
    }

    // -------------------------------------------

    export interface ReferenceType extends BaseType {
        description: string;
        properties: Array<Property>;
        additionalProperties?: Array<Property>;
    }

    export function isReferenceType(param: BaseType) : param is ReferenceType {
        return !isIntersectionType(param) &&
            !isArrayType(param) &&
            !isObjectType(param) &&
            !isEnumerateType(param);
    }

    // -------------------------------------------

    export interface ObjectType extends BaseType {
        properties: Array<Property>;
        typeName: 'object';
    }

    export function isObjectType(param: BaseType) : param is ObjectType {
        return param.typeName === 'object';
    }

    // -------------------------------------------

    export interface ArrayType extends BaseType {
        elementType: BaseType;
        typeName: 'array';
    }

    export function isArrayType(param: BaseType) : param is ArrayType {
        return param.typeName === 'array';
    }
}




