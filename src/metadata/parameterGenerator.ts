import {union} from 'lodash';
import * as ts from 'typescript';
import {Decorator} from "../decorator/type";
import { getDecoratorName, getDecoratorOptions, getDecoratorTextValue } from '../utils/decoratorUtils';
import { MetadataGenerator, Parameter} from './metadataGenerator';
import {TypeNodeResolver} from './resolver';
import {Resolver} from "./resolver/type";
import {getInitializerValue} from "./resolver/utils";

const supportedParameterKeys : Array<Decorator.ParameterServerKey> = [
    'SERVER_CONTEXT',
    'SERVER_PARAMS',
    'SERVER_QUERY',
    'SERVER_FORM',
    'SERVER_BODY',
    'SERVER_HEADERS',
    'SERVER_COOKIES',
    'SERVER_PATH_PARAMS',
    'SERVER_FILES_PARAM'
];

export class ParameterGenerator {
    constructor(
        private readonly parameter: ts.ParameterDeclaration,
        private readonly method: string,
        private readonly path: string,
        private readonly current: MetadataGenerator
    ) { }

    public generate(): Parameter {
        const decoratorName = getDecoratorName(this.parameter, identifier => this.supportParameterDecorator(identifier.text));

        if(typeof decoratorName === 'undefined') {
            return this.getBodyParameter(this.parameter);
        }

        for(let i=0; i<supportedParameterKeys.length; i++) {
            const representations : Array<string> = Decorator.getKeyRepresentations(supportedParameterKeys[i], this.current.decoratorMap);

            if(representations.indexOf(decoratorName) === -1) {
                continue;
            }

            switch (supportedParameterKeys[i]) {
                case 'SERVER_CONTEXT':
                    return this.getContextParameter(this.parameter);
                case 'SERVER_PARAMS':
                    return this.getRequestParameter(this.parameter);
                case 'SERVER_FORM':
                    return this.getFormParameter(this.parameter);
                case 'SERVER_QUERY':
                    return this.getQueryParameter(this.parameter);
                case 'SERVER_BODY':
                    return this.getBodyParameter(this.parameter);
                case 'SERVER_HEADERS':
                    return this.getHeaderParameter(this.parameter);
                case 'SERVER_COOKIES':
                    return this.getCookieParameter(this.parameter);
                case 'SERVER_PATH_PARAMS':
                    return this.getPathParameter(this.parameter);
                case 'SERVER_FILE_PARAM':
                    return this.getFileParameter(this.parameter);
                case 'SERVER_FILES_PARAM':
                    return this.getFileParameter(this.parameter, true);
            }
        }

        throw new Error('The decorator ' + decoratorName + ' of parameter ' + (this.parameter.name as ts.Identifier).text + ' could not be resolved.');
    }

    private getCurrentLocation() {
        const methodId = (this.parameter.parent as ts.MethodDeclaration).name as ts.Identifier;
        const controllerId = ((this.parameter.parent as ts.MethodDeclaration).parent as ts.ClassDeclaration).name as ts.Identifier;
        return `${controllerId.text}.${methodId.text}`;
    }

    private getRequestParameter(parameter: ts.ParameterDeclaration): Parameter {
        const parameterName = (parameter.name as ts.Identifier).text;
        const type = this.getValidatedType(parameter);

        if (!this.supportsBodyParameters(this.method)) {
            throw new Error(`Param can't support '${this.getCurrentLocation()}' method.`);
        }

        const decoratorRepresentation: Array<string> = Decorator.getKeyRepresentations('SERVER_PARAMS', this.current.decoratorMap);

        return {
            description: this.getParameterDescription(parameter),
            in: 'param',
            name: getDecoratorTextValue(this.parameter, ident => decoratorRepresentation.indexOf(ident.text) !== -1) || parameterName,
            parameterName: parameterName,
            required: !parameter.questionToken,
            type: type
        };
    }

    private getContextParameter(parameter: ts.ParameterDeclaration): Parameter {
        const parameterName = (parameter.name as ts.Identifier).text;

        return {
            description: this.getParameterDescription(parameter),
            in: 'context',
            name: parameterName,
            parameterName: parameterName,
            required: !parameter.questionToken,
            type: null
        };
    }

    /*
    private getFileParameter(parameter: ts.ParameterDeclaration): Parameter {
        const parameterName = (parameter.name as ts.Identifier).text;

        if (!this.supportsBodyParameters(this.method)) {
            throw new Error(`FileParam can't support '${this.getCurrentLocation()}' method.`);
        }

        return {
            description: this.getParameterDescription(parameter),
            in: 'formData',
            name: getDecoratorTextValue(this.parameter, ident => ident.text === 'FileParam') || parameterName,
            parameterName: parameterName,
            required: !parameter.questionToken,
            type: { typeName: 'file' }
        };
    }
     */

    private getFileParameter(parameter: ts.ParameterDeclaration, isArray?: boolean): Parameter {
        const parameterName = (parameter.name as ts.Identifier).text;

        if (!this.supportsBodyParameters(this.method)) {
            throw new Error(`File(s)Param can't support '${this.getCurrentLocation()}' method.`);
        }

        const decoratorRepresentation: Array<string> = Decorator.getKeyRepresentations(isArray ? 'SERVER_FILES_PARAM' : 'SERVER_FILE_PARAM', this.current.decoratorMap);

        const elementType: Resolver.Type = { typeName: 'file' };
        let type: Resolver.Type;
        if (isArray) {
            type = { typeName: 'array', elementType: elementType };
        } else {
            type = elementType;
        }

        return {
            description: this.getParameterDescription(parameter),
            in: 'formData',
            name: getDecoratorTextValue(this.parameter, ident => decoratorRepresentation.indexOf(ident.text) !== -1) || parameterName,
            parameterName: parameterName,
            required: !parameter.questionToken && !parameter.initializer,
            type: type
        };
    }

    private getFormParameter(parameter: ts.ParameterDeclaration): Parameter {
        const parameterName = (parameter.name as ts.Identifier).text;
        const type = this.getValidatedType(parameter);

        if (!this.supportsBodyParameters(this.method)) {
            throw new Error(`Form can't support '${this.getCurrentLocation()}' method.`);
        }

        const decoratorRepresentation: Array<string> = Decorator.getKeyRepresentations('SERVER_FORM', this.current.decoratorMap);

        return {
            description: this.getParameterDescription(parameter),
            in: 'formData',
            name: getDecoratorTextValue(this.parameter, ident => decoratorRepresentation.indexOf(ident.text) !== -1) || parameterName,
            parameterName: parameterName,
            required: !parameter.questionToken && !parameter.initializer,
            type: type
        };
    }

    private getCookieParameter(parameter: ts.ParameterDeclaration): Parameter {
        const parameterName = (parameter.name as ts.Identifier).text;
        const type = this.getValidatedType(parameter);

        if (!this.supportPathDataType(type)) {
           throw new Error(`Cookie can't support '${this.getCurrentLocation()}' method.`);
        }

        const decoratorRepresentation: Array<string> = Decorator.getKeyRepresentations('SERVER_COOKIES', this.current.decoratorMap);

        return {
            description: this.getParameterDescription(parameter),
            in: 'cookie',
            name: getDecoratorTextValue(this.parameter, ident => decoratorRepresentation.indexOf(ident.text) !== -1) || parameterName,
            parameterName: parameterName,
            required: !parameter.questionToken && !parameter.initializer,
            type: type
        };
    }

    private getBodyParameter(parameter: ts.ParameterDeclaration): Parameter {
        const parameterName = (parameter.name as ts.Identifier).text;
        const type = this.getValidatedType(parameter);

        if (!this.supportsBodyParameters(this.method)) {
            throw new Error(`Body can't support ${this.method} method`);
        }

        const decoratorRepresentation: Array<string> = Decorator.getKeyRepresentations('SERVER_BODY', this.current.decoratorMap);

        return {
            description: this.getParameterDescription(parameter),
            in: 'body',
            name: getDecoratorTextValue(this.parameter, ident => decoratorRepresentation.indexOf(ident.text) !== -1) || parameterName,
            parameterName: parameterName,
            required: !parameter.questionToken && !parameter.initializer,
            type: type
        };
    }

    private getHeaderParameter(parameter: ts.ParameterDeclaration): Parameter {
        const parameterName = (parameter.name as ts.Identifier).text;
        const type = this.getValidatedType(parameter);

        if (!this.supportPathDataType(type)) {
            throw new InvalidParameterException(`Parameter '${parameterName}' can't be passed as a header parameter in '${this.getCurrentLocation()}'.`);
        }

        const decoratorRepresentation: Array<string> = Decorator.getKeyRepresentations('SERVER_HEADERS', this.current.decoratorMap);

        return {
            description: this.getParameterDescription(parameter),
            in: 'header',
            name: getDecoratorTextValue(this.parameter, ident => decoratorRepresentation.indexOf(ident.text) !== -1) || parameterName,
            parameterName: parameterName,
            required: !parameter.questionToken && !parameter.initializer,
            type: type
        };
    }

    private getQueryParameter(parameter: ts.ParameterDeclaration): Parameter {
        const parameterName = (parameter.name as ts.Identifier).text;
        const parameterOptions = getDecoratorOptions(this.parameter, ident => ident.text === 'QueryParam' || ident.text === 'Query') || {};
        const type = this.getValidatedType(parameter);

        if (!this.supportQueryDataType(type)) {
            /*
            const arrayType = getCommonPrimitiveAndArrayUnionType(parameter.type);
            if (arrayType && this.supportQueryDataType(arrayType)) {
                type = arrayType;
            } else {
                throw new InvalidParameterException(`Parameter '${parameterName}' can't be passed as a query parameter in '${this.getCurrentLocation()}'.`);
            }
             */
            // throw new InvalidParameterException(`Parameter '${parameterName}' can't be passed as a query parameter in '${this.getCurrentLocation()}'.`);
        }
        let name : string;

        try {
            const decoratorRepresentation: Array<string> = Decorator.getKeyRepresentations('SERVER_QUERY', this.current.decoratorMap);
            name = getDecoratorTextValue(this.parameter, ident => decoratorRepresentation.indexOf(ident.text) !== -1);
        } catch (e) {
            name = parameterName;
        }

        return {
            allowEmptyValue: parameterOptions.allowEmptyValue,
            collectionFormat: parameterOptions.collectionFormat,
            default: getInitializerValue(parameter.initializer, this.current.typeChecker, type),
            description: this.getParameterDescription(parameter),
            in: 'query',
            maxItems: parameterOptions.maxItems,
            minItems: parameterOptions.minItems,
            name: name,
            parameterName: parameterName,
            required: !parameter.questionToken && !parameter.initializer,
            type: type
        };
    }

    private getPathParameter(parameter: ts.ParameterDeclaration): Parameter {
        const parameterName = (parameter.name as ts.Identifier).text;
        const type = this.getValidatedType(parameter);
        const decoratorRepresentation: Array<string> = Decorator.getKeyRepresentations('SERVER_PATH_PARAMS', this.current.decoratorMap);
        const pathName = getDecoratorTextValue(this.parameter, ident => decoratorRepresentation.indexOf(ident.text) !== -1) || parameterName;

        if (!this.supportPathDataType(type)) {
            throw new InvalidParameterException(`Parameter '${parameterName}:${type}' can't be passed as a path parameter in '${this.getCurrentLocation()}'.`);
        }

        if ((!this.path.includes(`{${pathName}}`)) && (!this.path.includes(`:${pathName}`))) {
            throw new Error(`Parameter '${parameterName}' can't match in path: '${this.path}'`);
        }

        return {
            description: this.getParameterDescription(parameter),
            in: 'path',
            name: pathName,
            parameterName: parameterName,
            required: true,
            type: type
        };
    }

    private getParameterDescription(node: ts.ParameterDeclaration) {
        const symbol = this.current.typeChecker.getSymbolAtLocation(node.name);

        if (symbol) {
            const comments = symbol.getDocumentationComment(this.current.typeChecker);
            if (comments.length) { return ts.displayPartsToString(comments); }
        }

        return '';
    }

    private supportsBodyParameters(method: string) {
        return ['delete', 'post', 'put', 'patch', 'get'].some(m => m === method);
    }

    private supportParameterDecorator(decoratorName: string) {
        const representations : Array<string> = supportedParameterKeys
            .map(parameter => Decorator.getKeyRepresentations(parameter, this.current.decoratorMap))
            .reduce((accumulator, currentValue) => union(accumulator, currentValue));

        return representations.some(d => d === decoratorName);
    }

    private supportPathDataType(parameterType:  Resolver.BaseType) {
        return ['string', 'integer', 'long', 'float', 'double', 'date', 'datetime', 'buffer', 'boolean', 'enum'].find(t => t === parameterType.typeName);
    }

    private supportQueryDataType(parameterType:  Resolver.BaseType) {
        // Copied from supportPathDataType and added 'array'. Not sure if all options apply to queries, but kept to avoid breaking change.
        return ['string', 'integer', 'long', 'float', 'double', 'date',
            'datetime', 'buffer', 'boolean', 'enum', 'array', 'object'].find(t => t === parameterType.typeName);
    }

    private getValidatedType(parameter: ts.ParameterDeclaration) {
        let typeNode = parameter.type;
        if (!typeNode) {
            const type = this.current.typeChecker.getTypeAtLocation(parameter);
            typeNode = this.current.typeChecker.typeToTypeNode(type, undefined, ts.NodeBuilderFlags.NoTruncation) as ts.TypeNode;
        }
        return new TypeNodeResolver(typeNode, this.current, parameter).resolve();
    }
}

class InvalidParameterException extends Error { }
