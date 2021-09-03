import {Property} from "../type";

export namespace Resolver {
    export type TypeStringLiteral =
        | 'string'
        | 'boolean'
        | 'double'
        | 'float'
        | 'file'
        | 'integer'
        | 'long'
        | 'enum'
        | 'array'
        | 'datetime'
        | 'date'
        | 'binary'
        | 'buffer'
        | 'byte'
        | 'void'
        | 'object'
        | 'any'
        | 'refEnum'
        | 'refObject'
        | 'refAlias'
        | 'nestedObjectLiteral'
        | 'union'
        | 'intersection';

    export type RefTypeLiteral = 'refObject' | 'refEnum' | 'refAlias';

    export type PrimitiveTypeLiteral = Exclude<TypeStringLiteral, RefTypeLiteral | 'enum' | 'array' | 'void' | 'nestedObjectLiteral' | 'union' | 'intersection'>;

    export type Type =
        | PrimitiveType
        | ObjectsNoPropsType
        | EnumType
        | ArrayType
        | FileType
        | DateTimeType
        | DateType
        | BinaryType
        | BufferType
        | ByteType
        | AnyType
        | RefEnumType
        | RefObjectType
        | RefAliasType
        | NestedObjectLiteralType
        | UnionType
        | IntersectionType;

    // -------------------------------------------

    export interface BaseType {
        typeName: TypeStringLiteral;
        typeArgument?: BaseType;
    }

    // -------------------------------------------
    // Primitive Type(s)
    // -------------------------------------------

    export type PrimitiveType = StringType | BooleanType | DoubleType | FloatType | IntegerType | LongType | VoidType;

    export interface AnyType extends  BaseType {
        typeName: 'any';
    }

    export function isAnyType(param: BaseType) : param is AnyType {
        return param.typeName === 'any';
    }

    export interface StringType extends BaseType {
        typeName: 'string';
    }

    export interface BooleanType extends BaseType {
        typeName: 'boolean';
    }

    export interface DoubleType extends BaseType {
        typeName: 'double';
    }

    export interface FloatType extends BaseType {
        typeName: 'float';
    }

    export interface IntegerType extends BaseType {
        typeName: 'integer';
    }

    export interface LongType extends BaseType {
        typeName: 'long';
    }

    export interface VoidType extends BaseType {
        typeName: 'void';
    }

    export function isVoidType(param: BaseType) : param is VoidType {
        return typeof param === 'undefined' || param.typeName === 'void';
    }

    // -------------------------------------------
    // Simple Type(s)
    // -------------------------------------------

    export interface DateType extends BaseType {
        typeName: 'date';
    }

    export interface FileType extends BaseType {
        typeName: 'file';
    }

    export interface DateTimeType extends BaseType {
        typeName: 'datetime';
    }

    export interface BinaryType extends BaseType {
        typeName: 'binary';
    }

    export interface BufferType extends BaseType {
        typeName: 'buffer';
    }

    export interface ByteType extends BaseType {
        typeName: 'byte';
    }

    export interface AnyType extends BaseType {
        typeName: 'any';
    }

    export interface ObjectsNoPropsType extends BaseType {
        typeName: 'object';
    }

    // -------------------------------------------
    // Complex Type(s)
    // -------------------------------------------

    export interface EnumType extends BaseType {
        members: Array<string | number | boolean | null>;
        typeName: 'enum';
    }

    export function isEnumType(param: BaseType) : param is EnumType {
        return param.typeName === 'enum';
    }

    // -------------------------------------------

    export interface ArrayType extends BaseType {
        elementType: BaseType;
        typeName: 'array';
    }

    export function isArrayType(param: BaseType) : param is ArrayType {
        return param.typeName === 'array';
    }

    // -------------------------------------------

    export interface NestedObjectLiteralType extends BaseType {
        typeName: 'nestedObjectLiteral';
        properties: Property[];
        additionalProperties?: Type;
    }

    export function isNestedObjectLiteralType(param: BaseType) : param is NestedObjectLiteralType {
        return param.typeName === 'nestedObjectLiteral';
    }

    // -------------------------------------------

    export interface IntersectionType extends BaseType {
        typeName: 'intersection';
        members: Type[];
    }

    export function isIntersectionType(param: BaseType) : param is IntersectionType {
        return param.typeName === 'intersection';
    }

    // -------------------------------------------

    export interface UnionType extends BaseType {
        typeName: 'union';
        members: Type[];
    }

    export function isUnionType(param: BaseType) : param is UnionType {
        return param.typeName === 'union';
    }

    // -------------------------------------------
    // Reference Type(s)
    // -------------------------------------------

    export type ReferenceType = RefEnumType | RefObjectType | RefAliasType;

    export interface ReferenceTypeBase extends BaseType {
        description?: string;
        typeName: RefTypeLiteral;
        refName: string;
        example?: unknown;
        deprecated: boolean;
    }

    export interface RefEnumType extends ReferenceTypeBase {
        typeName: 'refEnum';
        members: Array<string | number>;
        memberNames?: string[];
    }

    export function isRefEnumType(param: BaseType) : param is RefEnumType {
        return param.typeName === 'refEnum';
    }

    export interface RefObjectType extends ReferenceTypeBase {
        typeName: 'refObject';
        properties: Property[];
        additionalProperties?: Type;
    }

    export function isRefObjectType(param: BaseType) : param is RefObjectType {
        return param.typeName === 'refObject';
    }

    export interface RefAliasType extends Omit<Property, 'name' | 'required'>, ReferenceTypeBase {
        typeName: 'refAlias';
    }

    export function isRefAliasType(param: BaseType) : param is RefAliasType {
        return param.typeName === 'refAlias';
    }

    export function isReferenceType(param: BaseType) : param is ReferenceType {
        return param.typeName === 'refEnum' || param.typeName === 'refAlias' || param.typeName === 'refObject';
    }
}
