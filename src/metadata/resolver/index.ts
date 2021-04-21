import * as _ from 'lodash';
import * as ts from 'typescript';

import {
    getJSDocTagComment,
    getJSDocTagNames,
    isExistJSDocTag
} from '../../utils/jsDocUtils';
import {MetadataGenerator, Property} from '../metadataGenerator';
import {ResolverError} from "./error";
import {Resolver} from "./type";
import {getInitializerValue} from "./utils";

const localReferenceTypeCache: { [typeName: string]: Resolver.ReferenceType } = {};
const inProgressTypes: { [typeName: string]: boolean } = {};

type OverrideToken = ts.Token<ts.SyntaxKind.QuestionToken> | ts.Token<ts.SyntaxKind.PlusToken> | ts.Token<ts.SyntaxKind.MinusToken> | undefined;
type UsableDeclaration = ts.InterfaceDeclaration | ts.ClassDeclaration | ts.PropertySignature | ts.TypeAliasDeclaration | ts.EnumMember;

interface TypeNodeResolverContext {
    [name: string]: ts.TypeReferenceNode | ts.TypeNode;
}

function getPropertyValidators(property: ts.PropertyDeclaration | ts.TypeAliasDeclaration | ts.PropertySignature | ts.ParameterDeclaration) {
    return {};
}

export class TypeNodeResolver {
    constructor(
        private readonly typeNode: ts.TypeNode,
        private readonly current: MetadataGenerator,
        private readonly parentNode?: ts.Node,
        private context: TypeNodeResolverContext = {},
        private readonly referencer?: ts.TypeNode,
    ) {}

    public resolve(): Resolver.Type {
        const primitiveType = this.getPrimitiveType(this.typeNode, this.parentNode);
        if (primitiveType) {
            return primitiveType;
        }

        if (this.typeNode.kind === ts.SyntaxKind.NullKeyword) {
            return {
                typeName: 'enum',
                members: [null],
            } as Resolver.EnumType;
        }

        if (this.typeNode.kind === ts.SyntaxKind.ArrayType) {
            return {
                typeName: 'array',
                elementType: new TypeNodeResolver((this.typeNode as ts.ArrayTypeNode).elementType, this.current, this.parentNode, this.context).resolve(),
            } as Resolver.ArrayType;
        }

        if (ts.isUnionTypeNode(this.typeNode)) {
            const types = this.typeNode.types.map(type => {
                return new TypeNodeResolver(type, this.current, this.parentNode, this.context).resolve();
            });

            return {
                typeName: 'union',
                members: types,
            } as Resolver.UnionType;
        }

        if (ts.isIntersectionTypeNode(this.typeNode)) {
            const types = this.typeNode.types.map(type => {
                return new TypeNodeResolver(type, this.current, this.parentNode, this.context).resolve();
            });

            return {
                typeName: 'intersection',
                members: types,
            } as Resolver.IntersectionType;
        }

        if (this.typeNode.kind === ts.SyntaxKind.AnyKeyword || this.typeNode.kind === ts.SyntaxKind.UnknownKeyword) {
            return {
                typeName: 'any',
            } as Resolver.AnyType;
        }

        if (ts.isLiteralTypeNode(this.typeNode)) {
            return {
                typeName: 'enum',
                members: [this.getLiteralValue(this.typeNode)],
            } as Resolver.EnumType;
        }

        if (ts.isTypeLiteralNode(this.typeNode)) {
            const properties : Array<Property> = this.typeNode.members
                .filter(member => ts.isPropertySignature(member))
                .reduce((res, propertySignature: ts.PropertySignature) => {
                    const type = new TypeNodeResolver(propertySignature.type as ts.TypeNode, this.current, propertySignature, this.context).resolve();
                    const property: Property = {
                        example: this.getNodeExample(propertySignature),
                        default: getJSDocTagComment(propertySignature, 'default'),
                        description: this.getNodeDescription(propertySignature),
                        format: this.getNodeFormat(propertySignature),
                        name: (propertySignature.name as ts.Identifier).text,
                        required: !propertySignature.questionToken,
                        type: type,
                        validators: getPropertyValidators(propertySignature) || {},
                    };

                    return [property, ...res];
                }, []);

            const indexMember = this.typeNode.members.find(member => ts.isIndexSignatureDeclaration(member));
            let additionalType: Resolver.Type | undefined;

            if (indexMember) {
                const indexSignatureDeclaration = indexMember as ts.IndexSignatureDeclaration;
                const indexType = new TypeNodeResolver(indexSignatureDeclaration.parameters[0].type as ts.TypeNode, this.current, this.parentNode, this.context).resolve();
                if (indexType.typeName !== 'string') {
                    throw new ResolverError(`Only string indexers are supported.`, this.typeNode);
                }

                additionalType = new TypeNodeResolver(indexSignatureDeclaration.type, this.current, this.parentNode, this.context).resolve();
            }

            return {
                additionalProperties: indexMember && additionalType,
                typeName: 'nestedObjectLiteral',
                properties: properties,
            } as Resolver.NestedObjectLiteralType;
        }

        if (this.typeNode.kind === ts.SyntaxKind.ObjectKeyword) {
            return { typeName: 'object' };
        }

        if (ts.isMappedTypeNode(this.typeNode) && this.referencer) {
            const type = this.current.typeChecker.getTypeFromTypeNode(this.referencer);
            const mappedTypeNode = this.typeNode;
            const typeChecker = this.current.typeChecker;
            const getDeclaration = (prop: ts.Symbol) => prop.declarations && (prop.declarations[0] as ts.Declaration | undefined);
            const isIgnored = (prop: ts.Symbol) => {
                const declaration = getDeclaration(prop);
                return (
                    prop.getJsDocTags().find(tag => tag.name === 'ignore') !== undefined ||
                    (declaration !== undefined && !ts.isPropertyDeclaration(declaration) && !ts.isPropertySignature(declaration) && !ts.isParameter(declaration))
                );
            };
            const properties: Array<Property> = type
                .getProperties()
                // Ignore methods, getter, setter and @ignored props
                .filter(property => isIgnored(property) === false)
                // Transform to property
                .map(property => {
                    const propertyType = typeChecker.getTypeOfSymbolAtLocation(property, this.typeNode);
                    const declaration = getDeclaration(property) as ts.PropertySignature | ts.PropertyDeclaration | ts.ParameterDeclaration | undefined;

                    if (declaration && ts.isPropertySignature(declaration)) {
                        return { ...this.propertyFromSignature(declaration, mappedTypeNode.questionToken), name: property.getName() };
                    } else if (declaration && (ts.isPropertyDeclaration(declaration) || ts.isParameter(declaration))) {
                        return { ...this.propertyFromDeclaration(declaration, mappedTypeNode.questionToken), name: property.getName() };
                    }

                    // Resolve default value, required and typeNode
                    let required = false;
                    const typeNode = this.current.typeChecker.typeToTypeNode(propertyType, undefined, ts.NodeBuilderFlags.NoTruncation)!;
                    if (mappedTypeNode.questionToken && mappedTypeNode.questionToken.kind === ts.SyntaxKind.MinusToken) {
                        required = true;
                    } else if (mappedTypeNode.questionToken && mappedTypeNode.questionToken.kind === ts.SyntaxKind.QuestionToken) {
                        required = false;
                    }

                    // Push property
                    return {
                        name: property.getName(),
                        required: required,
                        type: new TypeNodeResolver(typeNode, this.current, this.typeNode, this.context, this.referencer).resolve(),
                        validators: {},
                    };
                });

            return {
                typeName: 'nestedObjectLiteral',
                properties: properties,
            } as Resolver.NestedObjectLiteralType;
        }

        if (ts.isConditionalTypeNode(this.typeNode) && this.referencer && ts.isTypeReferenceNode(this.referencer)) {
            const type = this.current.typeChecker.getTypeFromTypeNode(this.referencer);

            if (type.aliasSymbol) {
                let declaration = type.aliasSymbol.declarations[0] as ts.TypeAliasDeclaration | ts.EnumDeclaration | ts.DeclarationStatement;
                if (declaration.name) {
                    declaration = this.getModelTypeDeclaration(declaration.name as ts.EntityName) as ts.TypeAliasDeclaration | ts.EnumDeclaration | ts.DeclarationStatement;
                }
                
                const name = this.getRefTypeName(this.referencer.getText());
                return this.handleCachingAndCircularReferences(name, () => {
                    if (ts.isTypeAliasDeclaration(declaration)) {
                        // Note: I don't understand why typescript lose type for `this.referencer` (from above with isTypeReferenceNode())
                        return this.getTypeAliasReference(declaration, this.current.typeChecker.typeToString(type), this.referencer as ts.TypeReferenceNode);
                    } else if (ts.isEnumDeclaration(declaration)) {
                        return this.getEnumerateType(declaration.name) as Resolver.RefEnumType;
                    } else {
                        throw new ResolverError(
                            `Couldn't resolve Conditional to TypeNode. If you think this should be resolvable, please file an Issue. We found an aliasSymbol and it's declaration was of kind ${declaration.kind}`,
                            this.typeNode,
                        );
                    }
                });
            } else if (type.isClassOrInterface()) {
                let declaration = type.symbol.declarations[0] as ts.InterfaceDeclaration | ts.ClassDeclaration;
                if (declaration.name) {
                    declaration = this.getModelTypeDeclaration(declaration.name) as ts.InterfaceDeclaration | ts.ClassDeclaration;
                }
                const name = this.getRefTypeName(this.referencer.getText());
                return this.handleCachingAndCircularReferences(name, () => this.getModelReference(declaration, this.current.typeChecker.typeToString(type)));
            } else {
                try {
                    return new TypeNodeResolver(this.current.typeChecker.typeToTypeNode(type, undefined, ts.NodeBuilderFlags.NoTruncation)!, this.current, this.typeNode, this.context, this.referencer).resolve();
                } catch {
                    throw new ResolverError(
                        `Couldn't resolve Conditional to TypeNode. If you think this should be resolvable, please file an Issue. The flags on the result of the ConditionalType was ${type.flags}`,
                        this.typeNode,
                    );
                }
            }
        }

        if (ts.isTypeOperatorNode(this.typeNode) && this.typeNode.operator === ts.SyntaxKind.KeyOfKeyword) {
            const type = this.current.typeChecker.getTypeFromTypeNode(this.typeNode);
            try {
                return new TypeNodeResolver(this.current.typeChecker.typeToTypeNode(type, undefined, ts.NodeBuilderFlags.NoTruncation)!, this.current, this.typeNode, this.context, this.referencer).resolve();
            } catch (err) {
                const indexedTypeName = this.current.typeChecker.typeToString(this.current.typeChecker.getTypeFromTypeNode(this.typeNode.type));
                throw new ResolverError(`Could not determine the keys on ${indexedTypeName}`, this.typeNode);
            }
        }

        if (ts.isIndexedAccessTypeNode(this.typeNode) && (this.typeNode.indexType.kind === ts.SyntaxKind.NumberKeyword || this.typeNode.indexType.kind === ts.SyntaxKind.StringKeyword)) {
            const numberIndexType = this.typeNode.indexType.kind === ts.SyntaxKind.NumberKeyword;
            const objectType = this.current.typeChecker.getTypeFromTypeNode(this.typeNode.objectType);
            const type = numberIndexType ? objectType.getNumberIndexType() : objectType.getStringIndexType();
            if (type === undefined) {
                throw new ResolverError(`Could not determine ${numberIndexType ? 'number' : 'string'} index on ${this.current.typeChecker.typeToString(objectType)}`, this.typeNode);
            }
            return new TypeNodeResolver(this.current.typeChecker.typeToTypeNode(type, undefined, undefined)!, this.current, this.typeNode, this.context, this.referencer).resolve();
        }

        if (
            ts.isIndexedAccessTypeNode(this.typeNode) &&
            ts.isLiteralTypeNode(this.typeNode.indexType) &&
            (ts.isStringLiteral(this.typeNode.indexType.literal) || ts.isNumericLiteral(this.typeNode.indexType.literal))
        ) {
            const hasType = (node: ts.Node | undefined): node is ts.HasType => node !== undefined && node.hasOwnProperty('type');
            const symbol = this.current.typeChecker.getPropertyOfType(this.current.typeChecker.getTypeFromTypeNode(this.typeNode.objectType), this.typeNode.indexType.literal.text);
            if (symbol === undefined) {
                throw new ResolverError(
                    `Could not determine the keys on ${this.current.typeChecker.typeToString(this.current.typeChecker.getTypeFromTypeNode(this.typeNode.objectType))}`,
                    this.typeNode,
                );
            }
            if (hasType(symbol.valueDeclaration) && symbol.valueDeclaration.type) {
                return new TypeNodeResolver(symbol.valueDeclaration.type, this.current, this.typeNode, this.context, this.referencer).resolve();
            }
            const declaration = this.current.typeChecker.getTypeOfSymbolAtLocation(symbol, this.typeNode.objectType);
            try {
                return new TypeNodeResolver(this.current.typeChecker.typeToTypeNode(declaration, undefined, undefined)!, this.current, this.typeNode, this.context, this.referencer).resolve();
            } catch {
                throw new ResolverError(
                    `Could not determine the keys on ${this.current.typeChecker.typeToString(
                        this.current.typeChecker.getTypeFromTypeNode(this.current.typeChecker.typeToTypeNode(declaration, undefined, undefined)!),
                    )}`,
                    this.typeNode,
                );
            }
        }

        // @ts-ignore
        if (this.typeNode.kind === ts.SyntaxKind.TemplateLiteralType) {
            const type = this.current.typeChecker.getTypeFromTypeNode(this.referencer || this.typeNode);
            if (type.isUnion() && type.types.every(unionElementType => unionElementType.isStringLiteral())) {
                return {
                    typeName: 'enum',
                    members: type.types.map((stringLiteralType: ts.StringLiteralType) => stringLiteralType.value),
                } as Resolver.EnumType;
            } else {
                throw new ResolverError(`Could not the type of ${this.current.typeChecker.typeToString(this.current.typeChecker.getTypeFromTypeNode(this.typeNode), this.typeNode)}`, this.typeNode);
            }
        }

        if (ts.isParenthesizedTypeNode(this.typeNode)) {
            return new TypeNodeResolver(this.typeNode.type, this.current, this.typeNode, this.context, this.referencer).resolve();
        }

        if (this.typeNode.kind !== ts.SyntaxKind.TypeReference) {
            throw new ResolverError(`Unknown type: ${ts.SyntaxKind[this.typeNode.kind]}`, this.typeNode);
        }

        const typeReference = this.typeNode as ts.TypeReferenceNode;
        if (typeReference.typeName.kind === ts.SyntaxKind.Identifier) {
            if (typeReference.typeName.text === 'Date') {
                return this.getDateType(this.parentNode);
            }

            if (typeReference.typeName.text === 'Buffer' || typeReference.typeName.text === 'Readable') {
                return { typeName: 'buffer' } as Resolver.BufferType;
            }

            if (typeReference.typeName.text === 'Array' && typeReference.typeArguments && typeReference.typeArguments.length === 1) {
                return  {
                    typeName: 'array',
                    elementType: new TypeNodeResolver(typeReference.typeArguments[0], this.current, this.parentNode, this.context).resolve(),
                } as Resolver.ArrayType;
            }

            if (typeReference.typeName.text === 'Promise' && typeReference.typeArguments && typeReference.typeArguments.length === 1) {
                return new TypeNodeResolver(typeReference.typeArguments[0], this.current, this.parentNode, this.context).resolve();
            }

            if (typeReference.typeName.text === 'String') {
                return {typeName: 'string'} as Resolver.StringType;
            }

            if (this.context[typeReference.typeName.text]) {
                return new TypeNodeResolver(this.context[typeReference.typeName.text], this.current, this.parentNode, this.context).resolve();
            }
        }

        const referenceType = this.getReferenceType(typeReference);

        this.current.addReferenceType(referenceType);
        return referenceType;
    }

    private getLiteralValue(typeNode: ts.LiteralTypeNode): string | number | boolean | null {
        let value: boolean | number | string | null;
        switch (typeNode.literal.kind) {
            case ts.SyntaxKind.TrueKeyword:
                value = true;
                break;
            case ts.SyntaxKind.FalseKeyword:
                value = false;
                break;
            case ts.SyntaxKind.StringLiteral:
                value = typeNode.literal.text;
                break;
            case ts.SyntaxKind.NumericLiteral:
                value = parseFloat(typeNode.literal.text);
                break;
            case ts.SyntaxKind.NullKeyword:
                value = null;
                break;
            default:
                if (typeNode.literal.hasOwnProperty('text')) {
                    value = (typeNode.literal as ts.LiteralExpression).text;
                } else {
                    throw new ResolverError(`Couldn't resolve literal node: ${typeNode.literal.getText()}`);
                }
        }
        return value;
    }

    private getPrimitiveType(typeNode: ts.TypeNode, parentNode?: ts.Node): Resolver.PrimitiveType | undefined {
        const resolvedType = this.attemptToResolveKindToPrimitive(typeNode.kind);
        if (typeof resolvedType === 'undefined') {
            return undefined;
        }

        if (resolvedType === 'number') {
            if (!parentNode) {
                return { typeName: 'double' };
            }

            const tags = getJSDocTagNames(parentNode).filter(name => {
                return ['isInt', 'isLong', 'isFloat', 'isDouble'].some(m => m === name);
            });
            if (tags.length === 0) {
                return { typeName: 'double' };
            }

            switch (tags[0]) {
                case 'isInt':
                    return { typeName: 'integer' };
                case 'isLong':
                    return { typeName: 'long' };
                case 'isFloat':
                    return { typeName: 'float' };
                case 'isDouble':
                    return { typeName: 'double' };
                default:
                    return { typeName: 'double' };
            }
        } else if (resolvedType === 'string') {
            return {
                typeName: 'string',
            };
        } else if (resolvedType === 'boolean') {
            return {
                typeName: 'boolean',
            };
        } else if (resolvedType === 'void') {
            return {
                typeName: 'void',
            };
        } else {
            // todo: should not occur
            return resolvedType;
        }
    }

    private getDateType(parentNode?: ts.Node): Resolver.DateType | Resolver.DateTimeType {
        if (!parentNode) {
            return { typeName: 'datetime' };
        }
        const tags = getJSDocTagNames(parentNode).filter(name => {
            return ['isDate', 'isDateTime'].some(m => m === name);
        });

        if (tags.length === 0) {
            return { typeName: 'datetime' };
        }
        switch (tags[0]) {
            case 'isDate':
                return { typeName: 'date' };
            case 'isDateTime':
                return { typeName: 'datetime' };
            default:
                return { typeName: 'datetime' };
        }
    }

    private getDesignatedModels(nodes: Array<ts.Node>, typeName: string): Array<ts.Node> {
        /**
         * Model is marked with '@tsoaModel', indicating that it should be the 'canonical' model used
         */
        const designatedNodes = nodes.filter(enumNode => {
            return isExistJSDocTag(enumNode, tag => tag.tagName.text === 'tsoaModel');
        });
        if (designatedNodes.length > 0) {
            if (designatedNodes.length > 1) {
                throw new ResolverError(`Multiple models for ${typeName} marked with '@tsoaModel'; '@tsoaModel' should only be applied to one model.`);
            }

            return designatedNodes;
        }
        return nodes;
    }

    private getEnumerateType(typeName: ts.EntityName): Resolver.RefEnumType | undefined {
        const enumName = (typeName as ts.Identifier).text;
        let enumNodes = this.current.nodes.filter(node => node.kind === ts.SyntaxKind.EnumDeclaration).filter(node => (node as any).name.text === enumName);

        if (!enumNodes.length) {
            return undefined;
        }

        enumNodes = this.getDesignatedModels(enumNodes, enumName);

        if (enumNodes.length > 1) {
            throw new ResolverError(`Multiple matching enum found for enum ${enumName}; please make enum names unique.`);
        }

        const enumDeclaration = enumNodes[0] as ts.EnumDeclaration;

        const isNotUndefined = <T>(item: T): item is Exclude<T, undefined> => {
            return item !== undefined;
        };

        const enums = enumDeclaration.members.map(this.current.typeChecker.getConstantValue.bind(this.current.typeChecker)).filter(isNotUndefined);
        const enumNames = enumDeclaration.members.map(e => e.name.getText()).filter(isNotUndefined);

        return {
            typeName: 'refEnum',
            description: this.getNodeDescription(enumDeclaration),
            members: enums,
            memberNames: enumNames,
            refName: enumName,
        };
    }

    private getReferenceType(node: ts.TypeReferenceType): Resolver.ReferenceType {
        let type: ts.EntityName;
        if (ts.isTypeReferenceNode(node)) {
            type = node.typeName;
        } else if (ts.isExpressionWithTypeArguments(node)) {
            type = node.expression as ts.EntityName;
        } else {
            throw new ResolverError(`Can't resolve Reference type.`);
        }

        // Can't invoke getText on Synthetic Nodes
        let resolvableName = node.pos !== -1 ? node.getText() : (type as ts.Identifier).text;
        if (node.pos === -1 && 'typeArguments' in node && Array.isArray(node.typeArguments)) {
            // Add typearguments for Synthetic nodes (e.g. Record<> in TestClassModel.indexedResponse)
            const argumentsString = node.typeArguments.map(arg => {
                if (ts.isLiteralTypeNode(arg)) {
                    return `'${String(this.getLiteralValue(arg))}'`;
                }
                const resolvedType = this.attemptToResolveKindToPrimitive(arg.kind);
                if (typeof resolvedType === 'undefined') { return 'any'; }
                return resolvedType;
            });
            resolvableName += `<${argumentsString.join(', ')}>`;
        }

        const name = this.contextualizedName(resolvableName);

        this.typeArgumentsToContext(node, type, this.context);

        try {
            const existingType = localReferenceTypeCache[name];
            if (existingType) {
                return existingType;
            }

            const refEnumType = this.getEnumerateType(type);
            if (refEnumType) {
                localReferenceTypeCache[name] = refEnumType;
                return refEnumType;
            }

            if (inProgressTypes[name]) {
                return this.createCircularDependencyResolver(name);
            }

            inProgressTypes[name] = true;

            const declaration : UsableDeclaration = this.getModelTypeDeclaration(type);

            let referenceType: Resolver.ReferenceType;
            if (ts.isTypeAliasDeclaration(declaration)) {
                referenceType = this.getTypeAliasReference(declaration, name, node);
            } else if (ts.isEnumMember(declaration)) {
                referenceType = {
                    typeName: 'refEnum',
                    refName: this.getRefTypeName(name),
                    members: [this.current.typeChecker.getConstantValue(declaration)!],
                    // @ts-ignore
                    memberNames: [declaration.name.getText()],
                };
            } else {
                referenceType = this.getModelReference(declaration, name);
            }

            localReferenceTypeCache[name] = referenceType;

            return referenceType;
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error(`There was a problem resolving type of '${name}'.`);
            throw err;
        }
    }

    private getTypeAliasReference(declaration: ts.TypeAliasDeclaration, name: string, referencer: ts.TypeReferenceType): Resolver.ReferenceType {
        const example = this.getNodeExample(declaration);

        return {
            typeName: 'refAlias',
            default: getJSDocTagComment(declaration, 'default'),
            description: this.getNodeDescription(declaration),
            refName: this.getRefTypeName(name),
            format: this.getNodeFormat(declaration),
            type: new TypeNodeResolver(declaration.type, this.current, declaration, this.context, this.referencer || referencer).resolve(),
            validators: getPropertyValidators
            (declaration) || {},
            ...(example && { example: example }),
        };
    }

    private getModelReference(modelType: ts.InterfaceDeclaration | ts.ClassDeclaration, name: string) {
        const example = this.getNodeExample(modelType);
        const description = this.getNodeDescription(modelType);

        // Handle toJSON methods
        if (!modelType.name) {
            throw new ResolverError("Can't get Symbol from anonymous class", modelType);
        }
        const type = this.current.typeChecker.getTypeAtLocation(modelType.name);
        const toJSON = this.current.typeChecker.getPropertyOfType(type, 'toJSON');
        if (toJSON && toJSON.valueDeclaration && (ts.isMethodDeclaration(toJSON.valueDeclaration) || ts.isMethodSignature(toJSON.valueDeclaration))) {
            let nodeType = toJSON.valueDeclaration.type;
            if (!nodeType) {
                const signature = this.current.typeChecker.getSignatureFromDeclaration(toJSON.valueDeclaration);
                const implicitType = this.current.typeChecker.getReturnTypeOfSignature(signature!);
                nodeType = this.current.typeChecker.typeToTypeNode(implicitType, undefined, ts.NodeBuilderFlags.NoTruncation) as ts.TypeNode;
            }
            return {
                refName: this.getRefTypeName(name),
                typeName: 'refAlias',
                description: description,
                type: new TypeNodeResolver(nodeType, this.current).resolve(),
                validators: {},
                ...(example && { example: example }),
            } as Resolver.ReferenceType;
        }

        const properties = this.getModelProperties(modelType);
        const additionalProperties = this.getModelAdditionalProperties(modelType);
        const inheritedProperties = this.getModelInheritedProperties(modelType) || [];

        const referenceType: Resolver.ReferenceType & { properties: Array<Property> } = {
            additionalProperties: additionalProperties,
            typeName: 'refObject',
            description: description,
            properties: inheritedProperties,
            refName: this.getRefTypeName(name),
            ...(example && { example: example }),
        };

        referenceType.properties = referenceType.properties.concat(properties);

        return referenceType;
    }

    private getRefTypeName(name: string): string {
        return encodeURIComponent(
            name
                .replace(/<|>/g, '_')
                .replace(/\s+/g, '')
                .replace(/,/g, '.')
                .replace(/\'([^']*)\'/g, '$1')
                .replace(/\"([^"]*)\"/g, '$1')
                .replace(/&/g, '-and-')
                .replace(/\|/g, '-or-')
                .replace(/\[\]/g, '-Array')
                .replace(/{|}/g, '_') // SuccessResponse_{indexesCreated-number}_ -> SuccessResponse__indexesCreated-number__
                .replace(/([a-z]+):([a-z]+)/gi, '$1-$2') // SuccessResponse_indexesCreated:number_ -> SuccessResponse_indexesCreated-number_
                .replace(/;/g, '--')
                .replace(/([a-z]+)\[([a-z]+)\]/gi, '$1-at-$2'), // Partial_SerializedDatasourceWithVersion[format]_ -> Partial_SerializedDatasourceWithVersion~format~_,
        );
    }

    private attemptToResolveKindToPrimitive = (syntaxKind: ts.SyntaxKind) : 'number' | 'string' | 'boolean' | 'void' | undefined => {
        if (syntaxKind === ts.SyntaxKind.NumberKeyword) {
            return 'number';
        } else if (syntaxKind === ts.SyntaxKind.StringKeyword) {
            return 'string';
        } else if (syntaxKind === ts.SyntaxKind.BooleanKeyword) {
            return 'boolean';
        } else if (syntaxKind === ts.SyntaxKind.VoidKeyword) {
            return 'void';
        } else {
            return undefined;
        }
    }

    private contextualizedName(name: string): string {
        return Object.entries(this.context).reduce((acc, [key, entry]) => {
            return acc
                .replace(new RegExp(`<\\s*([^>]*\\s)*\\s*(${key})(\\s[^>]*)*\\s*>`, 'g'), `<$1${entry.getText()}$3>`)
                .replace(new RegExp(`<\\s*([^,]*\\s)*\\s*(${key})(\\s[^,]*)*\\s*,`, 'g'), `<$1${entry.getText()}$3,`)
                .replace(new RegExp(`,\\s*([^>]*\\s)*\\s*(${key})(\\s[^>]*)*\\s*>`, 'g'), `,$1${entry.getText()}$3>`)
                .replace(new RegExp(`<\\s*([^<]*\\s)*\\s*(${key})(\\s[^<]*)*\\s*<`, 'g'), `<$1${entry.getText()}$3<`);
        }, name);
    }

    private handleCachingAndCircularReferences(name: string, declarationResolver: () => Resolver.ReferenceType): Resolver.ReferenceType {
        try {
            const existingType = localReferenceTypeCache[name];
            if (existingType) {
                return existingType;
            }

            if (inProgressTypes[name]) {
                return this.createCircularDependencyResolver(name);
            }

            inProgressTypes[name] = true;

            const reference = declarationResolver();

            localReferenceTypeCache[name] = reference;

            this.current.addReferenceType(reference);

            return reference;
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error(`There was a problem resolving type of '${name}'.`);
            throw err;
        }
    }

    private createCircularDependencyResolver(refName: string) {
        const referenceType = {
            typeName: 'refObject',
            refName: refName,
        } as Resolver.ReferenceType;

        this.current.onFinish(referenceTypes => {
            const realReferenceType = referenceTypes[refName];
            if (!realReferenceType) {
                return;
            }
            referenceType.description = realReferenceType.description;
            if (realReferenceType.typeName === 'refObject' && referenceType.typeName === 'refObject') {
                referenceType.properties = realReferenceType.properties;
            }
            referenceType.typeName = realReferenceType.typeName;
            referenceType.refName = realReferenceType.refName;
        });

        return referenceType;
    }

    private nodeIsUsable(node: ts.Node) {
        switch (node.kind) {
            case ts.SyntaxKind.InterfaceDeclaration:
            case ts.SyntaxKind.ClassDeclaration:
            case ts.SyntaxKind.TypeAliasDeclaration:
            case ts.SyntaxKind.EnumDeclaration:
            case ts.SyntaxKind.EnumMember:
                return true;
            default:
                return false;
        }
    }

    private resolveLeftmostIdentifier(type: ts.EntityName): ts.Identifier {
        while (type.kind !== ts.SyntaxKind.Identifier) {
            type = type.left;
        }
        return type;
    }

    private resolveModelTypeScope(leftmost: ts.EntityName, statements: any): Array<any> {
        while (leftmost.parent && leftmost.parent.kind === ts.SyntaxKind.QualifiedName) {
            const leftmostName = leftmost.kind === ts.SyntaxKind.Identifier ? leftmost.text : leftmost.right.text;
            const moduleDeclarations = statements.filter((node: ts.Node) => {
                if ((node.kind !== ts.SyntaxKind.ModuleDeclaration || !this.current.isExportedNode(node)) && !ts.isEnumDeclaration(node)) {
                    return false;
                }

                const moduleDeclaration = node as ts.ModuleDeclaration | ts.EnumDeclaration;
                return (moduleDeclaration.name as ts.Identifier).text.toLowerCase() === leftmostName.toLowerCase();
            }) as Array<ts.ModuleDeclaration | ts.EnumDeclaration>;

            if (!moduleDeclarations.length) {
                throw new ResolverError(`No matching module declarations found for ${leftmostName}.`);
            }

            statements = Array.prototype.concat(
                ...moduleDeclarations.map(declaration => {
                    if (ts.isEnumDeclaration(declaration)) {
                        return declaration.members;
                    } else {
                        if (!declaration.body || !ts.isModuleBlock(declaration.body)) {
                            throw new ResolverError(`Module declaration found for ${leftmostName} has no body.`);
                        }
                        return declaration.body.statements;
                    }
                }),
            );

            leftmost = leftmost.parent as ts.EntityName;
        }

        return statements;
    }

    private getModelTypeDeclaration(type: ts.EntityName) {
        type UsableDeclarationWithoutPropertySignature = Exclude<UsableDeclaration, ts.PropertySignature>;

        const leftmostIdentifier = this.resolveLeftmostIdentifier(type);
        const statements: Array<any> = this.resolveModelTypeScope(leftmostIdentifier, this.current.nodes);

        const typeName = type.kind === ts.SyntaxKind.Identifier ? type.text : type.right.text;

        let modelTypes = statements.filter(node => {
            if (!this.nodeIsUsable(node) || !this.current.isExportedNode(node)) {
                return false;
            }

            const modelTypeDeclaration = node as UsableDeclaration;
            return (modelTypeDeclaration.name as ts.Identifier)?.text === typeName;
        }) as Array<UsableDeclarationWithoutPropertySignature>;

        if (!modelTypes.length) {
            throw new ResolverError(
                `No matching model found for referenced type ${typeName}. If ${typeName} comes from a dependency, please create an interface in your own code that has the same structure. Tsoa can not utilize interfaces from external dependencies. Read more at https://github.com/lukeautry/tsoa/blob/master/docs/ExternalInterfacesExplanation.MD`,
            );
        }

        if (modelTypes.length > 1) {
            // remove types that are from typescript e.g. 'Account'
            modelTypes = modelTypes.filter(modelType => {
                return modelType.getSourceFile().fileName.replace(/\\/g, '/').toLowerCase().indexOf('node_modules/typescript') <= -1;
            });

            modelTypes = this.getDesignatedModels(modelTypes, typeName) as Array<UsableDeclarationWithoutPropertySignature>;
        }
        if (modelTypes.length > 1) {
            const conflicts = modelTypes.map(modelType => modelType.getSourceFile().fileName).join('"; "');
            throw new ResolverError(`Multiple matching models found for referenced type ${typeName}; please make model names unique. Conflicts found: "${conflicts}".`);
        }

        return modelTypes[0];
    }

    private getModelProperties(node: ts.InterfaceDeclaration | ts.ClassDeclaration, overrideToken?: OverrideToken): Array<Property> {
        const isIgnored = (e: ts.TypeElement | ts.ClassElement) => {
            return isExistJSDocTag(e, tag => tag.tagName.text === 'ignore');
        };

        // Interface model
        if (ts.isInterfaceDeclaration(node)) {
            return node.members.filter(member => !isIgnored(member) && ts.isPropertySignature(member)).map((member: ts.PropertySignature) => this.propertyFromSignature(member, overrideToken));
        }

        // Class model
        const properties = node.members
            .filter(member => !isIgnored(member))
            .filter(member => member.kind === ts.SyntaxKind.PropertyDeclaration)
            .filter(member => !this.hasStaticModifier(member))
            .filter(member => this.hasPublicModifier(member)) as Array<ts.PropertyDeclaration | ts.ParameterDeclaration>;

        const classConstructor = node.members.find(member => ts.isConstructorDeclaration(member)) as ts.ConstructorDeclaration;

        if (classConstructor && classConstructor.parameters) {
            const constructorProperties = classConstructor.parameters.filter(parameter => this.isAccessibleParameter(parameter));

            properties.push(...constructorProperties);
        }

        return properties.map(property => this.propertyFromDeclaration(property, overrideToken));
    }

    private propertyFromSignature(propertySignature: ts.PropertySignature, overrideToken?: OverrideToken) {
        const identifier = propertySignature.name as ts.Identifier;

        if (!propertySignature.type) {
            throw new ResolverError(`No valid type found for property declaration.`);
        }

        let required = !propertySignature.questionToken;
        if (overrideToken && overrideToken.kind === ts.SyntaxKind.MinusToken) {
            required = true;
        } else if (overrideToken && overrideToken.kind === ts.SyntaxKind.QuestionToken) {
            required = false;
        }

        const property: Property = {
            default: getJSDocTagComment(propertySignature, 'default'),
            description: this.getNodeDescription(propertySignature),
            example: this.getNodeExample(propertySignature),
            format: this.getNodeFormat(propertySignature),
            name: identifier.text,
            required: required,
            type: new TypeNodeResolver(propertySignature.type, this.current, propertySignature.type.parent, this.context, propertySignature.type).resolve(),
            validators: getPropertyValidators(propertySignature) || {},
        };
        return property;
    }

    private propertyFromDeclaration(propertyDeclaration: ts.PropertyDeclaration | ts.ParameterDeclaration, overrideToken?: OverrideToken) {
        const identifier = propertyDeclaration.name as ts.Identifier;
        let typeNode = propertyDeclaration.type;

        if (!typeNode) {
            const tsType = this.current.typeChecker.getTypeAtLocation(propertyDeclaration);
            typeNode = this.current.typeChecker.typeToTypeNode(tsType, undefined, ts.NodeBuilderFlags.NoTruncation);
        }

        if (!typeNode) {
            throw new ResolverError(`No valid type found for property declaration.`);
        }

        const type = new TypeNodeResolver(typeNode, this.current, propertyDeclaration, this.context, typeNode).resolve();

        let required = !propertyDeclaration.questionToken && !propertyDeclaration.initializer;
        if (overrideToken && overrideToken.kind === ts.SyntaxKind.MinusToken) {
            required = true;
        } else if (overrideToken && overrideToken.kind === ts.SyntaxKind.QuestionToken) {
            required = false;
        }

        const property: Property = {
            default: getInitializerValue(propertyDeclaration.initializer, this.current.typeChecker),
            description: this.getNodeDescription(propertyDeclaration),
            example: this.getNodeExample(propertyDeclaration),
            format: this.getNodeFormat(propertyDeclaration),
            name: identifier.text,
            required: required,
            type: type,
            validators: getPropertyValidators(propertyDeclaration) || {},
        };
        return property;
    }

    private getModelAdditionalProperties(node: UsableDeclaration) {
        if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
            const indexMember = node.members.find(member => member.kind === ts.SyntaxKind.IndexSignature);
            if (!indexMember) {
                return undefined;
            }

            const indexSignatureDeclaration = indexMember as ts.IndexSignatureDeclaration;
            const indexType = new TypeNodeResolver(indexSignatureDeclaration.parameters[0].type as ts.TypeNode, this.current, this.parentNode, this.context).resolve();
            if (indexType.typeName !== 'string') {
                throw new ResolverError(`Only string indexers are supported.`, this.typeNode);
            }

            return new TypeNodeResolver(indexSignatureDeclaration.type, this.current, this.parentNode, this.context).resolve();
        }

        return undefined;
    }

    private typeArgumentsToContext(type: ts.TypeReferenceNode | ts.ExpressionWithTypeArguments, targetEntity: ts.EntityName, context: TypeNodeResolverContext): TypeNodeResolverContext {
        this.context = {};

        const declaration = this.getModelTypeDeclaration(targetEntity);
        const typeParameters = 'typeParameters' in declaration ? declaration.typeParameters : undefined;

        if (typeParameters) {
            for (let index = 0; index < typeParameters.length; index++) {
                const typeParameter = typeParameters[index];
                const typeArg = type.typeArguments && type.typeArguments[index];
                let resolvedType: ts.TypeNode;

                // Argument may be a forward reference from context
                if (typeArg && ts.isTypeReferenceNode(typeArg) && ts.isIdentifier(typeArg.typeName) && context[typeArg.typeName.text]) {
                    resolvedType = context[typeArg.typeName.text];
                } else if (typeArg) {
                    resolvedType = typeArg;
                } else if (typeParameter.default) {
                    resolvedType = typeParameter.default;
                } else {
                    throw new ResolverError(`Could not find a value for type parameter ${typeParameter.name.text}`, type);
                }

                this.context = {
                    ...this.context,
                    [typeParameter.name.text]: resolvedType,
                };
            }
        }
        return context;
    }

    private getModelInheritedProperties(modelTypeDeclaration: Exclude<UsableDeclaration, ts.PropertySignature | ts.TypeAliasDeclaration | ts.EnumMember>): Array<Property> {
        let properties: Array<Property> = [];

        const heritageClauses = modelTypeDeclaration.heritageClauses;
        if (!heritageClauses) {
            return properties;
        }

        heritageClauses.forEach(clause => {
            if (!clause.types) {
                return;
            }

            clause.types.forEach(t => {
                const baseEntityName = t.expression as ts.EntityName;

                // create subContext
                const resetCtx = this.typeArgumentsToContext(t, baseEntityName, this.context);

                const referenceType = this.getReferenceType(t);
                if (referenceType) {
                    if (referenceType.typeName === 'refEnum') {
                        // since it doesn't have properties to iterate over, then we don't do anything with it
                    } else if (referenceType.typeName === 'refAlias') {
                        let type: Resolver.Type = referenceType;
                        while (type.typeName === 'refAlias') {
                            type = type.type;
                        }

                        if (type.typeName === 'refObject') {
                            properties = [...properties, ...type.properties];
                        } else if (type.typeName === 'nestedObjectLiteral') {
                            properties = [...properties, ...type.properties];
                        }
                    } else if (referenceType.typeName === 'refObject') {
                        referenceType.properties.forEach(property => properties.push(property));
                    } else {
                        // todo: should never assert
                    }
                }

                // reset subContext
                this.context = resetCtx;
            });
        });

        return properties;
    }

    private hasPublicModifier(node: ts.Node) {
        return (
            !node.modifiers ||
            node.modifiers.every(modifier => {
                return modifier.kind !== ts.SyntaxKind.ProtectedKeyword && modifier.kind !== ts.SyntaxKind.PrivateKeyword;
            })
        );
    }

    private hasStaticModifier(node: ts.Node) {
        return (
            node.modifiers &&
            node.modifiers.some(modifier => {
                return modifier.kind === ts.SyntaxKind.StaticKeyword;
            })
        );
    }

    private isAccessibleParameter(node: ts.Node) {
        // No modifiers
        if (!node.modifiers) {
            return false;
        }

        // public || public readonly
        if (node.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.PublicKeyword)) {
            return true;
        }

        // readonly, not private readonly, not public readonly
        const isReadonly = node.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ReadonlyKeyword);
        const isProtectedOrPrivate = node.modifiers.some(modifier => {
            return modifier.kind === ts.SyntaxKind.ProtectedKeyword || modifier.kind === ts.SyntaxKind.PrivateKeyword;
        });
        return isReadonly && !isProtectedOrPrivate;
    }

    private getNodeDescription(node: UsableDeclaration | ts.PropertyDeclaration | ts.ParameterDeclaration | ts.EnumDeclaration) {
        const symbol = this.current.typeChecker.getSymbolAtLocation(node.name as ts.Node);
        if (!symbol) {
            return undefined;
        }

        /**
         * TODO: Workaround for what seems like a bug in the compiler
         * Warrants more investigation and possibly a PR against typescript
         */
        if (node.kind === ts.SyntaxKind.Parameter) {
            // TypeScript won't parse jsdoc if the flag is 4, i.e. 'Property'
            symbol.flags = 0;
        }

        const comments = symbol.getDocumentationComment(this.current.typeChecker);
        if (comments.length) {
            return ts.displayPartsToString(comments);
        }

        return undefined;
    }

    private getNodeFormat(node: UsableDeclaration | ts.PropertyDeclaration | ts.ParameterDeclaration | ts.EnumDeclaration) {
        return getJSDocTagComment(node, 'format');
    }

    private getNodeExample(node: UsableDeclaration | ts.PropertyDeclaration | ts.ParameterDeclaration | ts.EnumDeclaration) {
        const example = getJSDocTagComment(node, 'example');

        if (example) {
            try {
                return JSON.parse(example);
            } catch {
                return undefined;
            }
        } else {
            return undefined;
        }
    }
}

export function resolveType(typeNode?: ts.TypeNode, genericTypeMap?: Map<String, ts.TypeNode>): Resolver.BaseType {
    return null as Resolver.BaseType;
}
