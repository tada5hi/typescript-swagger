import * as ts from 'typescript';
import {RepresentationManager} from "../decorator/representation";
import {Decorator} from "../decorator/type";
import {getDecorators} from '../decorator/utils';
import { MetadataGenerator} from './index';
import {TypeNodeResolver} from './resolver';
import {Resolver} from "./resolver/type";
import {getInitializerValue} from "./resolver/utils";
import {Parameter} from "./type";

const supportedParameterKeys : Decorator.ParameterServerType[] = [
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
        const decorators = getDecorators(this.parameter);

        for(let i=0; i<supportedParameterKeys.length; i++) {
            const representation = this.current.decoratorMapper.match(supportedParameterKeys[i], decorators);
            if(typeof representation === 'undefined') {
                continue;
            }

            switch (supportedParameterKeys[i]) {
                case 'SERVER_CONTEXT':
                    return this.getContextParameter();
                case 'SERVER_PARAMS':
                    return this.getRequestParameter(representation);
                case 'SERVER_FORM':
                    return this.getFormParameter(representation);
                case 'SERVER_QUERY':
                    return this.getQueryParameter(representation);
                case 'SERVER_BODY':
                    return this.getBodyParameter(representation);
                case 'SERVER_HEADERS':
                    return this.getHeaderParameter(representation);
                case 'SERVER_COOKIES':
                    return this.getCookieParameter(representation);
                case 'SERVER_PATH_PARAMS':
                    return this.getPathParameter(representation);
                case 'SERVER_FILE_PARAM':
                    return this.getFileParameter(representation);
                case 'SERVER_FILES_PARAM':
                    return this.getFileParameter(representation, true);
            }
        }

        return this.getBodyParameter();
    }

    private getCurrentLocation() {
        const methodId = (this.parameter.parent as ts.MethodDeclaration).name as ts.Identifier;
        const controllerId = ((this.parameter.parent as ts.MethodDeclaration).parent as ts.ClassDeclaration).name as ts.Identifier;
        return `${controllerId.text}.${methodId.text}`;
    }

    private getRequestParameter(representationManager: RepresentationManager<'SERVER_PARAMS'>): Parameter {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;
        const type = this.getValidatedType(this.parameter);

        if (!this.supportsBodyParameters(this.method)) {
            throw new Error(`Param can't support '${this.getCurrentLocation()}' method.`);
        }

        const value = representationManager.getPropertyValue('DEFAULT');
        if(typeof value === 'string') {
            name = value;
        }


        return {
            description: this.getParameterDescription(this.parameter),
            in: 'param',
            name: name || parameterName,
            parameterName: parameterName,
            required: !this.parameter.questionToken,
            type: type
        };
    }

    private getContextParameter(): Parameter {
        const parameterName = (this.parameter.name as ts.Identifier).text;

        return {
            description: this.getParameterDescription(this.parameter),
            in: 'context',
            name: parameterName,
            parameterName: parameterName,
            required: !this.parameter.questionToken,
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

    private getFileParameter(
        representationManager: RepresentationManager<'SERVER_FILE_PARAM' | 'SERVER_FILES_PARAM'>,
        isArray?: boolean
    ): Parameter {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;

        if (!this.supportsBodyParameters(this.method)) {
            throw new Error(`File(s)Param can't support '${this.getCurrentLocation()}' method.`);
        }

        const value = representationManager.getPropertyValue('DEFAULT');
        if(typeof value === 'string') {
            name = value;
        }

        const elementType: Resolver.Type = { typeName: 'file' };
        let type: Resolver.Type;
        if (isArray) {
            type = { typeName: 'array', elementType: elementType };
        } else {
            type = elementType;
        }

        return {
            description: this.getParameterDescription(this.parameter),
            in: 'formData',
            name: name || parameterName,
            parameterName: parameterName,
            required: !this.parameter.questionToken && !this.parameter.initializer,
            type: type
        };
    }

    private getFormParameter(representationManager: RepresentationManager<'SERVER_FORM'>): Parameter {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;

        const type = this.getValidatedType(this.parameter);

        if (!this.supportsBodyParameters(this.method)) {
            throw new Error(`Form can't support '${this.getCurrentLocation()}' method.`);
        }

        const value = representationManager.getPropertyValue('DEFAULT');
        if(typeof value === 'string') {
            name = value;
        }


        return {
            description: this.getParameterDescription(this.parameter),
            in: 'formData',
            name: name || parameterName,
            parameterName: parameterName,
            required: !this.parameter.questionToken && !this.parameter.initializer,
            type: type
        };
    }

    private getCookieParameter(representationManager: RepresentationManager<'SERVER_COOKIES'>): Parameter {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;

        const type = this.getValidatedType(this.parameter);

        if (!this.supportPathDataType(type)) {
           throw new Error(`Cookie can't support '${this.getCurrentLocation()}' method.`);
        }

        const value = representationManager.getPropertyValue('DEFAULT');
        if(typeof value === 'string') {
            name = value;
        }

        return {
            description: this.getParameterDescription(this.parameter),
            in: 'cookie',
            name: name || parameterName,
            parameterName: parameterName,
            required: !this.parameter.questionToken && !this.parameter.initializer,
            type: type
        };
    }

    private getBodyParameter(representationManager?: RepresentationManager<'SERVER_BODY'>): Parameter {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;

        const type = this.getValidatedType(this.parameter);

        if (!this.supportsBodyParameters(this.method)) {
            throw new Error(`Body can't support ${this.method} method`);
        }

        if(typeof representationManager !== 'undefined') {
            const value = representationManager.getPropertyValue('DEFAULT');
            if (typeof value === 'string') {
                name = value;
            }
        }

        return {
            description: this.getParameterDescription(this.parameter),
            in: 'body',
            name: name || parameterName,
            parameterName: parameterName,
            required: !this.parameter.questionToken && !this.parameter.initializer,
            type: type
        };
    }

    private getHeaderParameter(representationManager: RepresentationManager<'SERVER_HEADERS'>): Parameter {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let name = parameterName;

        const type = this.getValidatedType(this.parameter);

        if (!this.supportPathDataType(type)) {
            throw new InvalidParameterException(`Parameter '${parameterName}' can't be passed as a header parameter in '${this.getCurrentLocation()}'.`);
        }

        const value = representationManager.getPropertyValue('DEFAULT');
        if(typeof value === 'string') {
            name = value;
        }

        return {
            description: this.getParameterDescription(this.parameter),
            in: 'header',
            name: name || parameterName,
            parameterName: parameterName,
            required: !this.parameter.questionToken && !this.parameter.initializer,
            type: type
        };
    }

    private getQueryParameter(representationManager: RepresentationManager<'SERVER_QUERY'>): Parameter {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        const type = this.getValidatedType(this.parameter);

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
        let name : string = parameterName;
        let options : any = {};

        const nameValue = representationManager.getPropertyValue('DEFAULT');
        if(typeof nameValue === 'string') {
            name = nameValue;
        }

        const optionsValue = representationManager.getPropertyValue('OPTIONS');
        if(typeof optionsValue !== 'undefined') {
            options = optionsValue;
        }

        return {
            allowEmptyValue: options.allowEmptyValue,
            collectionFormat: options.collectionFormat,
            default: getInitializerValue(this.parameter.initializer, this.current.typeChecker, type),
            description: this.getParameterDescription(this.parameter),
            in: 'query',
            maxItems: options.maxItems,
            minItems: options.minItems,
            name: name,
            parameterName: parameterName,
            required: !this.parameter.questionToken && !this.parameter.initializer,
            type: type
        };
    }

    private getPathParameter(representationManager: RepresentationManager<'SERVER_PATH_PARAMS'>): Parameter {
        const parameterName = (this.parameter.name as ts.Identifier).text;
        let pathName = parameterName;

        const type = this.getValidatedType(this.parameter);

        const value = representationManager.getPropertyValue('DEFAULT');
        if(typeof value === 'string') {
            pathName = value;
        }


        if (!this.supportPathDataType(type)) {
            throw new InvalidParameterException(`Parameter '${parameterName}:${type}' can't be passed as a path parameter in '${this.getCurrentLocation()}'.`);
        }

        if ((!this.path.includes(`{${pathName}}`)) && (!this.path.includes(`:${pathName}`))) {
            throw new Error(`Parameter '${parameterName}' can't match in path: '${this.path}'`);
        }

        return {
            description: this.getParameterDescription(this.parameter),
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
