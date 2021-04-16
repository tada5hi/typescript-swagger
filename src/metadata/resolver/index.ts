import * as _ from 'lodash';
import {
    ArrayLiteralExpression,
    ArrayTypeNode,
    ClassDeclaration,
    ConstructorDeclaration,
    displayPartsToString,
    EntityName,
    EnumDeclaration,
    Expression,
    HeritageClause,
    Identifier,
    IndexSignatureDeclaration,
    InterfaceDeclaration,
    IntersectionTypeNode,
    Node,
    NumericLiteral,
    ParameterDeclaration,
    PropertyDeclaration,
    PropertySignature,
    QualifiedName,
    StringLiteral,
    SyntaxKind,
    TypeAliasDeclaration,
    TypeNode,
    TypeParameterDeclaration,
    TypeReferenceNode,
    UnionTypeNode
} from 'typescript';
import {getDecoratorName} from '../../utils/decoratorUtils';
import {getFirstMatchingJSDocTagName} from '../../utils/jsDocUtils';
import {keywords} from '../keywordKinds';
import {
    MetadataGenerator,
    Property
} from '../metadataGenerator';
import {ResolverType} from "./type";



const syntaxKindMap: { [kind: number]: string } = {};
syntaxKindMap[SyntaxKind.NumberKeyword] = 'number';
syntaxKindMap[SyntaxKind.StringKeyword] = 'string';
syntaxKindMap[SyntaxKind.BooleanKeyword] = 'boolean';
syntaxKindMap[SyntaxKind.VoidKeyword] = 'void';

const localReferenceTypeCache: { [typeName: string]: ReferenceType } = {};
const inProgressTypes: { [typeName: string]: boolean } = {};

type UsableDeclaration = InterfaceDeclaration | ClassDeclaration | TypeAliasDeclaration;

export interface TypeNodeResolverContext {
    [key: string]: TypeReferenceNode | TypeNode;
}

export class TypeNodeResolver {
    constructor(
        private readonly typeNode: TypeNode,
        private readonly current: MetadataGenerator,
        private readonly parentNode?: Node,
        private context: TypeNodeResolverContext = {},
        private readonly referencer?: TypeNode,
    ) {}

    public resolve() {

    }
}

export function resolveType(typeNode?: TypeNode, genericTypeMap?: Map<String, TypeNode>): ResolverType.BaseType {
    if (!typeNode) {
        return { typeName: 'void' };
    }

    // string, number, .... (scalars)
    const primitiveType = getPrimitiveType(typeNode);
    if (primitiveType) {
        return primitiveType;
    }

    // null
    if(typeNode.kind === SyntaxKind.NullKeyword || typeNode.kind === SyntaxKind.UndefinedKeyword) {
        return {
            enumMembers: [null],
            typeName: 'enum'
        } as ResolverType.EnumerateType;
    }

    // Array | any[]
    if (typeNode.kind === SyntaxKind.ArrayType) {
        const arrayType = typeNode as ArrayTypeNode;
        return {
            elementType: resolveType(arrayType.elementType, genericTypeMap),
            typeName: 'array'
        } as ResolverType.ArrayType;
    }

    if(typeNode.kind === SyntaxKind.IntersectionType) {
        // return getIntersectionType(typeNode);
    }

    if ((typeNode.kind === SyntaxKind.AnyKeyword) || (typeNode.kind === SyntaxKind.ObjectKeyword)) {
        return { typeName: 'object' };
    }

    if (typeNode.kind === SyntaxKind.TypeLiteral) {
        return getInlineObjectType(typeNode);
    }

    // union f.E string | number
    if (typeNode.kind === SyntaxKind.UnionType) {
        return getUnionType(typeNode);
    }

    if(typeNode.kind === SyntaxKind.TypeQuery) {
        throw new Error(`TypeQuery not supported yet...`);
    }

    if (typeNode.kind !== SyntaxKind.TypeReference) {
        throw new Error(`Unknown type: ${SyntaxKind[typeNode.kind]}`);
    }

    let typeReference: any = typeNode;
    let typeName = resolveSimpleTypeName(typeReference.typeName as EntityName);

    if (typeName === 'Date') { return getDateType(typeNode); }
    if (typeName === 'Buffer') { return { typeName: 'buffer' }; }
    if (typeName === 'DownloadBinaryData') { return { typeName: 'buffer' }; }
    if (typeName === 'DownloadResource') { return { typeName: 'buffer' }; }

    if (typeName === 'Promise') {
        typeReference = typeReference.typeArguments[0];
        return resolveType(typeReference, genericTypeMap);
    }
    if (typeName === 'Array') {
        typeReference = typeReference.typeArguments[0];
        return {
            elementType: resolveType(typeReference, genericTypeMap),
            typeName: 'array'
        } as ResolverType.ArrayType;
    }

    const enumType = getResolverType.EnumerateType(typeNode);
    if (enumType) {
        return enumType;
    }

    const literalType = getLiteralType(typeNode);
    if (literalType) {
        return literalType;
    }

    let referenceType: ResolverType.ReferenceType;

    if (typeReference.typeArguments && typeReference.typeArguments.length === 1) {
        const typeT: Array<TypeNode> = typeReference.typeArguments as Array<TypeNode>;
        referenceType = getReferenceType(typeReference.typeName as EntityName, genericTypeMap, typeT);
        typeName = resolveSimpleTypeName(typeReference.typeName as EntityName);
        if (['NewResource', 'RequestAccepted', 'MovedPermanently', 'MovedTemporarily'].indexOf(typeName) >= 0) {
            referenceType.typeName = typeName;
            referenceType.typeArgument = resolveType(typeT[0], genericTypeMap);
        } else {
            MetadataGenerator.current.addReferenceType(referenceType);
        }
    } else {
        referenceType = getReferenceType(typeReference.typeName as EntityName, genericTypeMap);
        MetadataGenerator.current.addReferenceType(referenceType);
    }

    return referenceType;
}

function getPrimitiveType(typeNode: TypeNode): ResolverType.BaseType | undefined {
    const primitiveType = syntaxKindMap[typeNode.kind];
    if (!primitiveType) { return undefined; }

    if (primitiveType === 'number') {
        const parentNode = typeNode.parent as Node;
        if (!parentNode) {
            return { typeName: 'double' };
        }

        const validDecorators = ['IsInt', 'IsLong', 'IsFloat', 'IsDouble'];

        // Can't use decorators on interface/type properties, so support getting the type from jsdoc too.
        const jsdocTagName = getFirstMatchingJSDocTagName(parentNode, tag => {
            return validDecorators.some(t => t === tag.tagName.text);
        });

        const decoratorName = getDecoratorName(parentNode, identifier => {
            return validDecorators.some(m => m === identifier.text);
        });

        switch (decoratorName || jsdocTagName) {
            case 'IsInt':
                return { typeName: 'integer' };
            case 'IsLong':
                return { typeName: 'long' };
            case 'IsFloat':
                return { typeName: 'float' };
            case 'IsDouble':
                return { typeName: 'double' };
            default:
                return { typeName: 'double' };
        }
    }
    return { typeName: primitiveType };
}

function getDateType(typeNode: TypeNode): ResolverType.BaseType {
    const parentNode = typeNode.parent as Node;
    if (!parentNode) {
        return { typeName: 'datetime' };
    }
    const decoratorName = getDecoratorName(parentNode, identifier => {
        return ['IsDate', 'IsDateTime'].some(m => m === identifier.text);
    });
    switch (decoratorName) {
        case 'IsDate':
            return { typeName: 'date' };
        case 'IsDateTime':
            return { typeName: 'datetime' };
        default:
            return { typeName: 'datetime' };
    }
}

function getResolverType.EnumerateType(typeNode: TypeNode): ResolverType.ResolverType.EnumerateType | undefined {
    const enumName = (typeNode as any).typeName.text;
    const enumTypes = MetadataGenerator.current.nodes
        .filter(node => node.kind === SyntaxKind.EnumDeclaration)
        .filter(node => (node as any).name.text === enumName);

    if (!enumTypes.length) { return undefined; }
    if (enumTypes.length > 1) { throw new Error(`Multiple matching enum found for enum ${enumName}; please make enum names unique.`); }

    const enumDeclaration = enumTypes[0] as EnumDeclaration;

    function getEnumValue(member: any) {
        const initializer = member.initializer;
        if (initializer) {
            if (initializer.expression) {
                return parseEnumValueByKind(initializer.expression.text, initializer.kind);
            }
            return parseEnumValueByKind(initializer.text, initializer.kind);
        }
        return;
    }
    return {
        enumMembers: enumDeclaration.members.map((member: any, index) => {
            return getEnumValue(member) || index;
        }),
        typeName: 'enum',
    } as ResolverType.ResolverType.EnumerateType;
}

function parseEnumValueByKind(value: string, kind: SyntaxKind): any {
    return kind === SyntaxKind.NumericLiteral ? parseFloat(value) : value;
}

function getUnionType(typeNode: TypeNode) {
    const union = typeNode as UnionTypeNode;

    let baseType: any = null;
    let isObject = false;
    union.types.forEach(type => {
        if (baseType === null) {
            baseType = type;
        }
        if (baseType.kind !== type.kind) {
            isObject = true;
        }
    });

    if (isObject) {
        const commonType = getCommonPrimitiveAndArrayUnionType(typeNode);
        if(commonType) {
            return commonType;
        } else {
            return {typeName: 'object'};
        }
    }

    return {
        enumMembers: union.types.map((type, index) => {
            return type.getText() ? removeQuotes(type.getText()) : index;
        }),
        typeName: 'enum',
    } as ResolverType.EnumerateType;
}

// @ts-ignore
function getIntersectionType(typeNode: TypeNode) : IntersectionType {
    const intersection = typeNode as IntersectionTypeNode;

    return {
        enumMembers: intersection.types.map((type, index) => {
            return type.getText() ? removeQuotes(type.getText()) : index;
        }),
        typeName: 'intersection',
    } as IntersectionType;
}

function removeQuotes(str: string) {
    return str.replace(/^["']|["']$/g, '');
}
function getLiteralType(typeNode: TypeNode): ResolverType.EnumerateType | undefined {
    const literalName = (typeNode as any).typeName.text;
    const literalTypes = MetadataGenerator.current.nodes
        .filter(node => node.kind === SyntaxKind.TypeAliasDeclaration)
        .filter(node => {
            const innerType = (node as any).type;
            return innerType.kind === SyntaxKind.UnionType && (innerType as any).types;
        })
        .filter(node => (node as any).name.text === literalName);

    if (!literalTypes.length) { return undefined; }
    if (literalTypes.length > 1) { throw new Error(`Multiple matching enum found for enum ${literalName}; please make enum names unique.`); }

    const unionTypes = (literalTypes[0] as any).type.types;
    return {
        enumMembers: unionTypes.map((unionNode: any) => unionNode.literal.text as string),
        typeName: 'enum',
    } as ResolverType.EnumerateType;
}

function getInlineObjectType(typeNode: TypeNode): ObjectType {
    return {
        properties: getModelTypeProperties(typeNode),
        typeName: ''
    };
}

function getReferenceType(type: EntityName, genericTypeMap?: Map<String, TypeNode>, genericTypes?: Array<TypeNode>): ReferenceType {
    let typeName = resolveFqTypeName(type);
    if (genericTypeMap && genericTypeMap.has(typeName)) {
        const refType: any = genericTypeMap.get(typeName);
        type = refType.typeName as EntityName;
        typeName = resolveFqTypeName(type);
    }
    const typeNameWithGenerics = getTypeName(typeName, genericTypes);

    try {
        const existingType = localReferenceTypeCache[typeNameWithGenerics];
        if (existingType) { return existingType; }

        if (inProgressTypes[typeNameWithGenerics]) {
            return createCircularDependencyResolver(typeNameWithGenerics);
        }

        inProgressTypes[typeNameWithGenerics] = true;

        const modelTypeDeclaration = getModelTypeDeclaration(type);

        const properties = getModelTypeProperties(modelTypeDeclaration, genericTypes);
        const additionalProperties = getModelTypeAdditionalProperties(modelTypeDeclaration);

        const referenceType: ReferenceType = {
            description: getModelDescription(modelTypeDeclaration),
            properties: properties,
            typeName: typeNameWithGenerics,
        };
        if (additionalProperties && additionalProperties.length) {
            referenceType.additionalProperties = additionalProperties;
        }

        const extendedProperties = getInheritedProperties(modelTypeDeclaration, genericTypes);
        mergeReferenceTypeProperties(referenceType.properties, extendedProperties);

        localReferenceTypeCache[typeNameWithGenerics] = referenceType;

        return referenceType;
    } catch (err) {
        console.error(`There was a problem resolving type of '${getTypeName(typeName, genericTypes)}'.`);
        throw err;
    }
}

function mergeReferenceTypeProperties(properties: Array<Property>, extendedProperties: Array<Property>) {
    extendedProperties.forEach(prop => {
        const existingProp = properties.find(p => p.name === prop.name);
        if (existingProp) {
            existingProp.description = existingProp.description || prop.description;
        } else {
            properties.push(prop);
        }
    });
}

function resolveFqTypeName(type: EntityName): string {
    if (type.kind === SyntaxKind.Identifier) {
        return (type as Identifier).text;
    }

    const qualifiedType = type as QualifiedName;
    return resolveFqTypeName(qualifiedType.left) + '.' + (qualifiedType.right as Identifier).text;
}

function resolveSimpleTypeName(type: EntityName): string {
    if (type.kind === SyntaxKind.Identifier) {
        return (type as Identifier).text;
    }

    const qualifiedType = type as QualifiedName;
    return (qualifiedType.right as Identifier).text;
}

function getTypeName(typeName: string, genericTypes?: Array<TypeNode>): string {
    if (!genericTypes || !genericTypes.length) { return typeName; }
    return typeName + genericTypes.map(t => getAnyTypeName(t)).join('');
}

function getAnyTypeName(typeNode: TypeNode): string {
    const primitiveType = syntaxKindMap[typeNode.kind];
    if (primitiveType) {
        return primitiveType;
    }

    if (typeNode.kind === SyntaxKind.ArrayType) {
        const arrayType = typeNode as ArrayTypeNode;
        return getAnyTypeName(arrayType.elementType) + 'Array';
    }

    if (typeNode.kind === SyntaxKind.UnionType ||
        typeNode.kind === SyntaxKind.AnyKeyword
    ) {
        return 'object';
    }

    if (typeNode.kind !== SyntaxKind.TypeReference) {
        throw new Error(`Unknown type: ${SyntaxKind[typeNode.kind]}`);
    }

    const typeReference = typeNode as TypeReferenceNode;
    try {
        const typeName = (typeReference.typeName as Identifier).text;
        if (typeName === 'Array') {
            return getAnyTypeName(typeReference.typeArguments[0]) + 'Array';
        }
        return typeName;
    } catch (e) {
        // idk what would hit this? probably needs more testing
        console.error(e);
        return typeNode.toString();
    }
}

function createCircularDependencyResolver(typeName: string) {
    const referenceType = {
        description: '',
        properties: new Array<Property>(),
        typeName: typeName,
    };

    MetadataGenerator.current.onFinish(referenceTypes => {
        const realReferenceType = referenceTypes[typeName];
        if (!realReferenceType) { return; }
        referenceType.description = realReferenceType.description;
        referenceType.properties = realReferenceType.properties;
        referenceType.typeName = realReferenceType.typeName;
    });

    return referenceType;
}

function nodeIsUsable(node: Node) {
    switch (node.kind) {
        case SyntaxKind.InterfaceDeclaration:
        case SyntaxKind.ClassDeclaration:
        case SyntaxKind.TypeAliasDeclaration:
            return true;
        default: return false;
    }
}

function resolveLeftmostIdentifier(type: EntityName): Identifier {
    while (type.kind !== SyntaxKind.Identifier) {
        type = (type as QualifiedName).left;
    }
    return type as Identifier;
}

function resolveModelTypeScope(leftmost: EntityName, statements: Array<any>): Array<any> {
    // while (leftmost.parent && leftmost.parent.kind === SyntaxKind.QualifiedName) {
    //     const leftmostName = leftmost.kind === SyntaxKind.Identifier
    //         ? (leftmost as Identifier).text
    //         : (leftmost as QualifiedName).right.text;
    //     const moduleDeclarations = statements
    //         .filter(node => {
    //             if (node.kind === SyntaxKind.ModuleDeclaration) {
    //                 const moduleDeclaration = node as ts.ModuleDeclaration;
    //                 return (moduleDeclaration.name as Identifier).text.toLowerCase() === leftmostName.toLowerCase();
    //             }
    //             return false;
    //         }) as Array<ts.ModuleDeclaration>;

    //     if (!moduleDeclarations.length) { throw new Error(`No matching module declarations found for ${leftmostName}`); }
    //     if (moduleDeclarations.length > 1) { throw new Error(`Multiple matching module declarations found for ${leftmostName}; please make module declarations unique`); }

    //     const moduleBlock = moduleDeclarations[0].body as ts.ModuleBlock;
    //     if (moduleBlock === null || moduleBlock.kind !== SyntaxKind.ModuleBlock) { throw new Error(`Module declaration found for ${leftmostName} has no body`); }

    //     statements = moduleBlock.statements;
    //     leftmost = leftmost.parent as EntityName;
    // }

    return statements;
}

function getModelTypeDeclaration(type: EntityName) {
    const leftmostIdentifier = resolveLeftmostIdentifier(type);
    const statements: Array<any> = resolveModelTypeScope(leftmostIdentifier, MetadataGenerator.current.nodes);

    const typeName = type.kind === SyntaxKind.Identifier
        ? (type as Identifier).text
        : (type as QualifiedName).right.text;

    const modelTypes = statements
        .filter(node => {
            if (!nodeIsUsable(node)) {
                return false;
            }

            const modelTypeDeclaration = node as UsableDeclaration;
            return (modelTypeDeclaration.name as Identifier).text === typeName;
        }) as Array<UsableDeclaration>;

    if (!modelTypes.length) { throw new Error(`No matching model found for referenced type ${typeName}`); }
    if (modelTypes.length > 1) {
         const conflicts = modelTypes.map(modelType => modelType.getSourceFile().fileName).join('"; "');
         throw new Error(`Multiple matching models found for referenced type ${typeName}; please make model names unique. Conflicts found: "${conflicts}"`);
    }

    return modelTypes[0];
}

function getModelTypeProperties(node: any, genericTypes?: Array<TypeNode>): Array<Property> {
    if (node.kind === SyntaxKind.TypeLiteral || node.kind === SyntaxKind.InterfaceDeclaration) {
        const interfaceDeclaration = node as InterfaceDeclaration;
        return interfaceDeclaration.members
            .filter(member => {
                if ((member as any).type && (member as any).type.kind === SyntaxKind.FunctionType) {
                    return false;
                }
                return member.kind === SyntaxKind.PropertySignature;
            })
            .map((member: any) => {

                const propertyDeclaration = member as PropertyDeclaration;
                const identifier = propertyDeclaration.name as Identifier;

                if (!propertyDeclaration.type) { throw new Error('No valid type found for property declaration.'); }

                // Declare a variable that can be overridden if needed
                let aType = propertyDeclaration.type;

                // aType.kind will always be a TypeReference when the property of Interface<T> is of type T
                if (aType.kind === SyntaxKind.TypeReference && genericTypes && genericTypes.length && node.typeParameters) {

                    // The type definitions are conviently located on the object which allow us to map -> to the genericTypes
                    const typeParams = _.map(node.typeParameters, (typeParam: TypeParameterDeclaration) => {
                        return typeParam.name.text;
                    });

                    // I am not sure in what cases
                    const typeIdentifier = (aType as TypeReferenceNode).typeName;
                    let typeIdentifierName: string;

                    // typeIdentifier can either be a Identifier or a QualifiedName
                    if ((typeIdentifier as Identifier).text) {
                        typeIdentifierName = (typeIdentifier as Identifier).text;
                    } else {
                        typeIdentifierName = (typeIdentifier as QualifiedName).right.text;
                    }

                    // I could not produce a situation where this did not find it so its possible this check is irrelevant
                    const indexOfType = _.indexOf<string>(typeParams, typeIdentifierName);
                    if (indexOfType >= 0) {
                        aType = genericTypes[indexOfType] as TypeNode;
                    }
                }

                return {
                    description: getNodeDescription(propertyDeclaration),
                    name: identifier.text,
                    required: !propertyDeclaration.questionToken,
                    type: resolveType(aType)
                };
            });
    }

    if (node.kind === SyntaxKind.TypeAliasDeclaration) {
        const typeAlias = node as TypeAliasDeclaration;

        return !keywords.includes(typeAlias.type.kind)
            ? getModelTypeProperties(typeAlias.type, genericTypes)
            : [];
    }

    const classDeclaration = node as ClassDeclaration;

    let properties = classDeclaration.members.filter((member: any) => {
        if (member.kind !== SyntaxKind.PropertyDeclaration) { return false; }

        const propertySignature = member as PropertySignature;
        return propertySignature && hasPublicMemberModifier(propertySignature);
    }) as Array<PropertyDeclaration | ParameterDeclaration>;

    const classConstructor = classDeclaration.members.find((member: any) => member.kind === SyntaxKind.Constructor) as ConstructorDeclaration;
    if (classConstructor && classConstructor.parameters) {
        properties = properties.concat(classConstructor.parameters.filter(parameter => hasPublicConstructorModifier(parameter)) as any);
    }

    return properties
        .map(declaration => {
            const identifier = declaration.name as Identifier;

            if (!declaration.type) { throw new Error('No valid type found for property declaration.'); }

            return {
                description: getNodeDescription(declaration),
                name: identifier.text,
                required: !declaration.questionToken,
                type: resolveType(resolveTypeParameter(declaration.type, classDeclaration, genericTypes))
            };
        });
}

function resolveTypeParameter(type: any, classDeclaration: ClassDeclaration, genericTypes?: Array<TypeNode>) {
    if (genericTypes && classDeclaration.typeParameters && classDeclaration.typeParameters.length) {
        for (let i = 0; i < classDeclaration.typeParameters.length; i++) {
            if (type.typeName && classDeclaration.typeParameters[i].name.text === type.typeName.text) {
                return genericTypes[i];
            }
        }
    }
    return type;
}

function getModelTypeAdditionalProperties(node: UsableDeclaration) {
    if (node.kind === SyntaxKind.InterfaceDeclaration) {
        const interfaceDeclaration = node as InterfaceDeclaration;
        return interfaceDeclaration.members
            .filter(member => member.kind === SyntaxKind.IndexSignature)
            .map((member: any) => {
                const indexSignatureDeclaration = member as IndexSignatureDeclaration;

                const indexType = resolveType(indexSignatureDeclaration.parameters[0].type as TypeNode);
                if (indexType.typeName !== 'string') {
                    throw new Error(`Only string indexers are supported. Found ${indexType.typeName}.`);
                }

                return {
                    description: '',
                    name: '',
                    required: true,
                    type: resolveType(indexSignatureDeclaration.type as TypeNode)
                };
            });
    }

    return undefined;
}

function hasPublicMemberModifier(node: Node) {
    return !node.modifiers || node.modifiers.every(modifier => {
        return modifier.kind !== SyntaxKind.ProtectedKeyword && modifier.kind !== SyntaxKind.PrivateKeyword;
    });
}

function hasPublicConstructorModifier(node: Node) {
    return node.modifiers && node.modifiers.some(modifier => {
        return modifier.kind === SyntaxKind.PublicKeyword;
    });
}

function getInheritedProperties(modelTypeDeclaration: UsableDeclaration, genericTypes?: Array<TypeNode>): Array<Property> {
    const properties = new Array<Property>();
    if (modelTypeDeclaration.kind === SyntaxKind.TypeAliasDeclaration) {
        return [];
    }
    const heritageClauses = modelTypeDeclaration.heritageClauses;
    if (!heritageClauses) { return properties; }

    heritageClauses.forEach(clause => {
        if (!clause.types) { return; }

        clause.types.forEach((t: any) => {
            let type: any = MetadataGenerator.current.getClassDeclaration(t.expression.getText());
            if (!type) {
                type = MetadataGenerator.current.getInterfaceDeclaration(t.expression.getText());
            }
            if (!type) {
                throw new Error(`No type found for ${t.expression.getText()}`);
            }
            const baseEntityName = t.expression as EntityName;
            const parentGenerictypes = resolveTypeArguments(modelTypeDeclaration as ClassDeclaration, genericTypes);
            const genericTypeMap = resolveTypeArguments(type, t.typeArguments, parentGenerictypes);
            const subClassGenericTypes: any = getSubClassGenericTypes(genericTypeMap, t.typeArguments);
            getReferenceType(baseEntityName, genericTypeMap, subClassGenericTypes).properties
                .forEach(property => properties.push(property));
        });
    });

    return properties;
}

function getModelDescription(modelTypeDeclaration: UsableDeclaration) {
    return getNodeDescription(modelTypeDeclaration);
}

function getNodeDescription(node: UsableDeclaration | PropertyDeclaration | ParameterDeclaration) {
    const symbol = MetadataGenerator.current.typeChecker.getSymbolAtLocation(node.name as Node);

    if (symbol) {
        /**
         * TODO: Workaround for what seems like a bug in the compiler
         * Warrants more investigation and possibly a PR against typescript
         */
        if (node.kind === SyntaxKind.Parameter) {
            // TypeScript won't parse jsdoc if the flag is 4, i.e. 'Property'
            symbol.flags = 0;
        }

        const comments = symbol.getDocumentationComment(MetadataGenerator.current.typeChecker);
        if (comments.length) { return displayPartsToString(comments); }
    }

    return '';
}

function getSubClassGenericTypes(genericTypeMap?: Map<String, TypeNode>, typeArguments?: Array<TypeNode>) {
    if (genericTypeMap && typeArguments) {
        const result: Array<TypeNode> = [];
        typeArguments.forEach((t: any) => {
            const typeName = getAnyTypeName(t);
            if (genericTypeMap.has(typeName)) {
                result.push(genericTypeMap.get(typeName) as TypeNode);
            } else {
                result.push(t);
            }
        });
        return result;
    }
    return null;
}

export function getSuperClass(node: ClassDeclaration, typeArguments?: Map<String, TypeNode>) {
    const clauses = node?.heritageClauses;
    if (clauses) {
        const filteredClauses = clauses.filter(clause => clause.token === SyntaxKind.ExtendsKeyword);
        if (filteredClauses.length > 0) {
            const clause: HeritageClause = filteredClauses[0];
            if (clause.types && clause.types.length) {
                const type: any = MetadataGenerator.current.getClassDeclaration(clause.types[0].expression.getText());
                return {
                    type: type,
                    typeArguments: resolveTypeArguments(type, clause.types[0].typeArguments, typeArguments)
                };
            }
        }
    }
    return undefined;
}

function buildGenericTypeMap(node: ClassDeclaration, typeArguments?: ReadonlyArray<TypeNode>) {
    const result: Map<String, TypeNode> = new Map<String, TypeNode>();
    if (typeof node !== 'undefined' && node.typeParameters && typeArguments) {
        node.typeParameters.forEach((typeParam, index) => {
            const paramName = typeParam.name.text;
            result.set(paramName, typeArguments[index]);
        });
    }
    return result;
}

function resolveTypeArguments(node: ClassDeclaration, typeArguments?: ReadonlyArray<TypeNode>, parentTypeArguments?: Map<String, TypeNode>) {
    const result = buildGenericTypeMap(node, typeArguments);
    if (parentTypeArguments) {
        result.forEach((value: any, key) => {
            const typeName = getAnyTypeName(value);
            if (parentTypeArguments.has(typeName)) {
                result.set(key, parentTypeArguments.get(typeName) as TypeNode);
            }
        });
    }
    return result;
}

/**
 * Used to identify union types of a primitive and array of the same primitive, e.g. `string | string[]`
 */
export function getCommonPrimitiveAndArrayUnionType(typeNode?: TypeNode): BaseType | null {
    if (typeNode && typeNode.kind === SyntaxKind.UnionType) {
        const union = typeNode as UnionTypeNode;
        const types = union.types.map(t => resolveType(t));
        const arrType = types.find(t => t.typeName === 'array') as ArrayType | undefined;
        const primitiveType = types.find(t => t.typeName !== 'array');

        if (types.length === 2 && arrType && arrType.elementType && primitiveType && arrType.elementType.typeName === primitiveType.typeName) {
            return arrType;
        }
    }

    return null;
}

export function getLiteralValue(expression: Expression): any {
    if (expression.kind === SyntaxKind.StringLiteral) {
        return (expression as StringLiteral).text;
    }
    if (expression.kind === SyntaxKind.NumericLiteral) {
        return parseFloat((expression as NumericLiteral).text);
    }
    if (expression.kind === SyntaxKind.TrueKeyword) {
        return true;
    }
    if (expression.kind === SyntaxKind.FalseKeyword) {
        return false;
    }
    if (expression.kind === SyntaxKind.ArrayLiteralExpression) {
        return (expression as ArrayLiteralExpression).elements.map(e => getLiteralValue(e));
    }
    return;
}
