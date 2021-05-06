import {union} from 'lodash';
import * as pathUtil from 'path';
import * as ts from 'typescript';
import {Decorator} from "../decorator/type";
import {getDecorators} from '../utils/decoratorUtils';
import { getJSDocDescription, getJSDocTagComment, isExistJSDocTag } from '../utils/jsDocUtils';
import { EndpointGenerator } from './endpointGenerator';
import {MetadataGenerator, Method, Parameter, ResponseData, ResponseType} from './metadataGenerator';
import { ParameterGenerator } from './parameterGenerator';
import {TypeNodeResolver} from './resolver';
import {Resolver} from "./resolver/type";
import MethodHttpVerbKey = Decorator.MethodHttpVerbID;

export class MethodGenerator extends EndpointGenerator<ts.MethodDeclaration> {
    private method: string;

    // --------------------------------------------------------------------

    constructor(
        node: ts.MethodDeclaration,
        current: MetadataGenerator,
        private readonly controllerPath: string
    ) {
        super(node, current);
        this.processMethodDecorators();
    }

    // --------------------------------------------------------------------

    public isValid() {
        return !!this.method;
    }

    public getMethodName() {
        const identifier = this.node.name as ts.Identifier;
        return identifier.text;
    }

    public generate(): Method {
        if (!this.isValid()) { throw new Error('This isn\'t a valid controller method.'); }

        this.debugger('Generating Metadata for method %s', this.getCurrentLocation());

        let nodeType = this.node.type;
        if (!nodeType) {
            const typeChecker = this.current.typeChecker;
            const signature = typeChecker.getSignatureFromDeclaration(this.node);
            const implicitType = typeChecker.getReturnTypeOfSignature(signature!);
            nodeType = typeChecker.typeToTypeNode(implicitType, undefined, ts.NodeBuilderFlags.NoTruncation) as ts.TypeNode;
        }

        const type = new TypeNodeResolver(nodeType, this.current).resolve();
        const responses = this.mergeResponses(this.getResponses(), this.getMethodSuccessResponse(type));

        const tagsDecoratorKey : Array<string> = Decorator.getIDRepresentations('SWAGGER_TAGS', this.current.decoratorMap);
        const tags : Array<any> = union(...tagsDecoratorKey.map(key => this.getDecoratorValues(key)));

        const consumesDecoratorKey : Array<string> = Decorator.getIDRepresentations('REQUEST_CONSUMES', this.current.decoratorMap);
        const consumes : Array<any> = union(...consumesDecoratorKey.map(key => this.getDecoratorValues(key)));
        
        const methodMetadata : Method = {
            consumes: consumes,
            // todo: rework deprecated
            deprecated: isExistJSDocTag(this.node, 'deprecated'),
            description: getJSDocDescription(this.node),
            method: this.method,
            name: (this.node.name as ts.Identifier).text,
            parameters: this.buildParameters(),
            path: this.path,
            produces: this.getProduces(),
            responses: responses,
            security: this.getSecurity(),
            summary: getJSDocTagComment(this.node, 'summary'),
            tags: tags,
            type: type
        };

        this.debugger('Generated Metadata for method %s: %j', this.getCurrentLocation(), methodMetadata);
        return methodMetadata;
    }

    protected getCurrentLocation() {
        const methodId = this.node.name as ts.Identifier;
        const controllerId = (this.node.parent as ts.ClassDeclaration).name as ts.Identifier;
        return `${controllerId.text}.${methodId.text}`;
    }

    private buildParameters() {
        this.debugger('Processing method %s parameters.', this.getCurrentLocation());
        const parameters = this.node.parameters.map((p: ts.ParameterDeclaration) => {
            try {
                const path = pathUtil.posix.join('/', (this.controllerPath ? this.controllerPath : ''), this.path);

                return new ParameterGenerator(p, this.method, path, this.current).generate();
            } catch (e) {
                const methodId = this.node.name as ts.Identifier;
                const controllerId = (this.node.parent as ts.ClassDeclaration).name as ts.Identifier;
                const parameterId = p.name as ts.Identifier;
                throw new Error(`Error generate parameter method: '${controllerId.text}.${methodId.text}' argument: ${parameterId.text} ${e}`);
            }
        }).filter((p: Parameter) => (p.in !== 'context') && (p.in !== 'cookie'));

        const bodyParameters = parameters.filter((p: Parameter) => p.in === 'body');
        const formParameters = parameters.filter((p: Parameter) => p.in === 'formData');

        if (bodyParameters.length > 1) {
            throw new Error(`Only one body parameter allowed in '${this.getCurrentLocation()}' method.`);
        }
        if (bodyParameters.length > 0 && formParameters.length > 0) {
            throw new Error(`Choose either during @FormParam and @FileParam or body parameter  in '${this.getCurrentLocation()}' method.`);
        }
        this.debugger('Parameters list for method %s: %j.', this.getCurrentLocation(), parameters);
        return parameters;
    }

    private processMethodDecorators() {
        const httpMethodDecorators = getDecorators(this.node, decorator => this.supportsPathMethod(decorator.text));

        if (!httpMethodDecorators || !httpMethodDecorators.length) { return; }
        if (httpMethodDecorators.length > 1) {
            throw new Error(`Only one HTTP Method decorator in '${this.getCurrentLocation}' method is acceptable, Found: ${httpMethodDecorators.map(d => d.text).join(', ')}`);
        }

        const methodDecorator = httpMethodDecorators[0];
        this.method = methodDecorator.text.toLowerCase();
        this.debugger('Processing method %s decorators.', this.getCurrentLocation());

        this.generatePath('METHOD_PATH');

        this.debugger('Mapping endpoint %s %s', this.method, this.path);
    }

    private getMethodSuccessResponse(type: Resolver.BaseType): ResponseType {
        const responseData = MethodGenerator.getMethodSuccessResponseData(type);

        return {
            description: Resolver.isVoidType(type) ? 'No content' : 'Ok',
            examples: this.getMethodSuccessExamples(),
            schema: responseData.type,
            status: responseData.status
        };
    }

    private static getMethodSuccessResponseData(type:  Resolver.BaseType): ResponseData {
        switch (type.typeName) {
            case 'void': return { status: '204', type: type };
            default: return { status: '200', type: type };
        }
    }

    private getMethodSuccessExamples() {
        const representations = Decorator.getIDRepresentations('RESPONSE_EXAMPLE', this.current.decoratorMap);
        const exampleDecorators = union(...representations.map(representation => getDecorators(this.node, decorator => decorator.text === representation)));
        if (!exampleDecorators || !exampleDecorators.length) { return undefined; }
        if (exampleDecorators.length > 1) {
            throw new Error(`Only one Example decorator allowed in '${this.getCurrentLocation}' method.`);
        }

        const d = exampleDecorators[0];
        const argument = d.arguments[0];

        return this.getExamplesValue(argument);
    }

    private mergeResponses(responses: Array<ResponseType>, defaultResponse: ResponseType) {
        if (!responses || !responses.length) {
            return [defaultResponse];
        }

        const index = responses.findIndex((resp) => resp.status === defaultResponse.status);

        if (index >= 0) {
            if (defaultResponse.examples && !responses[index].examples) {
                responses[index].examples = defaultResponse.examples;
            }
        } else {
            responses.push(defaultResponse);
        }
        return responses;
    }

    private supportsPathMethod(method: string) : boolean {
        return (['ALL', 'GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS', 'HEAD'] as Array<MethodHttpVerbKey>).some(m => m.toLowerCase() === method.toLowerCase());
    }
}
