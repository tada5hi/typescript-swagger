import {Resolver} from "../../../../src/metadata/resolver/type";

describe('type.ts', () => {
    it('check void type', () => {
        const type : Resolver.BaseType = {
            typeName: "void"
        };
        expect(Resolver.isVoidType(type)).toBeTruthy();

        type.typeName = 'any';

        expect(Resolver.isVoidType(type)).toBeFalsy();
    });

    // -------------------------------------------

    it('check array type', () => {
        let type : Resolver.ArrayType | Resolver.AnyType = {
            typeName: "array",
            elementType: {
                typeName: "void"
            }
        };
        expect(Resolver.isArrayType(type)).toBeTruthy();

        type = {
            typeName: "any"
        };

        expect(Resolver.isArrayType(type)).toBeFalsy();
    });

    // -------------------------------------------

    it('check nested object literal type', () => {
        let type : Resolver.NestedObjectLiteralType | Resolver.AnyType = {
            typeName: "nestedObjectLiteral",
            properties: []
        };
        expect(Resolver.isNestedObjectLiteralType(type)).toBeTruthy();

        type = {
            typeName: "any"
        };

        expect(Resolver.isNestedObjectLiteralType(type)).toBeFalsy();
    });

    // -------------------------------------------

    it('check union type', () => {
        let type : Resolver.UnionType | Resolver.AnyType = {
            typeName: "union",
            members: []
        };
        expect(Resolver.isUnionType(type)).toBeTruthy();

        type = {
            typeName: "any"
        };

        expect(Resolver.isUnionType(type)).toBeFalsy();
    });

    // -------------------------------------------

    it('check ref enum type', () => {
        let type : Resolver.RefEnumType | Resolver.AnyType = {
            deprecated: false,
            typeName: "refEnum",
            members: [],
            refName: "test"
        };

        expect(Resolver.isRefEnumType(type)).toBeTruthy();
        expect(Resolver.isReferenceType(type)).toBeTruthy();

        type = {
            typeName: "any"
        };

        expect(Resolver.isRefEnumType(type)).toBeFalsy();
        expect(Resolver.isReferenceType(type)).toBeFalsy();
    });

    // -------------------------------------------

    it('check ref object type', () => {
        let type : Resolver.RefObjectType | Resolver.AnyType = {
            deprecated: false,
            typeName: "refObject",
            refName: "test",
            properties: []
        };

        expect(Resolver.isRefObjectType(type)).toBeTruthy();
        expect(Resolver.isReferenceType(type)).toBeTruthy();

        type = {
            typeName: "any"
        };

        expect(Resolver.isRefObjectType(type)).toBeFalsy();
        expect(Resolver.isReferenceType(type)).toBeFalsy();
    });

    // -------------------------------------------

    it('check ref alias type', () => {
        let type : Resolver.RefAliasType | Resolver.AnyType = {
            deprecated: false,
            typeName: "refAlias",
            refName: "test",
            type: null
        };

        expect(Resolver.isRefAliasType(type)).toBeTruthy();
        expect(Resolver.isReferenceType(type)).toBeTruthy();

        type = {
            typeName: "any"
        };

        expect(Resolver.isRefAliasType(type)).toBeFalsy();
        expect(Resolver.isReferenceType(type)).toBeFalsy();
    });
});
