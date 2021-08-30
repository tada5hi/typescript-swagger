'use strict';

import {castArray} from 'lodash';
import {ArrayLiteralExpression, isArrayLiteralExpression, Node, SyntaxKind} from 'typescript';
import {useDebugger} from "../debug";
import {Decorator} from "../decorator/type";
import { getDecorators } from '../decorator/utils';
import {normalizePath} from "../utils/pathUtils";
import {MetadataGenerator} from './index';
import {TypeNodeResolver} from './resolver';
import {ResponseType} from "./type";

export abstract class EndpointGenerator<T extends Node> {
    protected path: string | undefined;
    protected node: T;

    protected debugger = useDebugger();

    // -------------------------------------------

    protected constructor(node: T, protected current: MetadataGenerator) {
        this.node = node;
    }

    // -------------------------------------------

    // --------------------------------------------------------------------

    protected generatePath(key: Decorator.Type) {
        const values : string[] = [];

        const handler = Decorator.getRepresentationHandler(key, this.current.decoratorMap);
        const config = handler.matchToNodeDecorator(this.node);
        const property = handler.getPropertyByType(config.id);

        if(typeof property !== 'undefined') {

            const argument = handler. getPropertyValueAsItem(config.decorator, property);
            if (typeof argument !== 'undefined') {
                values.push(argument);
            }
        }

        this.path = normalizePath(values.join('/'));
    }

    // --------------------------------------------------------------------

    protected getDecoratorValues(decoratorName: string, acceptMultiple: boolean = false) : any[] {
        const decorators = getDecorators(this.node, decorator => decorator.text === decoratorName);
        if (!decorators || !decorators.length) { return []; }
        if (!acceptMultiple && decorators.length > 1) {
            throw new Error(`Only one ${decoratorName} decorator allowed in ${this.getCurrentLocation()}.`);
        }
        let result: any[];
        if (acceptMultiple) {
            result = decorators.map(d => d.arguments);
        } else {
            const d = decorators[0];
            result = d.arguments;
        }
        this.debugger('Arguments of decorator %s: %j', decoratorName, result);
        return result;
    }

    // -------------------------------------------

    protected getSecurity() {
        const securities = this.getDecoratorValues('Security', true);
        if (!securities || !securities.length) { return undefined; }

        return securities.map(security => ({
            name: security[1] ? security[1] : 'default',
            scopes: security[0] ? castArray(this.handleRolesArray(security[0])) : []
        }));
    }

    protected handleRolesArray(argument: ArrayLiteralExpression): string[] {
        if (isArrayLiteralExpression(argument)) {
            return argument.elements.map(value => value.getText())
                .map(val => (val && val.startsWith('\'') && val.endsWith('\'')) ? val.slice(1, -1) : val);
        } else {
            return argument;
        }
    }

    // -------------------------------------------

    protected getExamplesValue(argument: any) {
        let example: any = {};

        if(typeof argument === 'undefined') {
            return example;
        }

        this.debugger(argument);
        if (argument.properties) {
            argument.properties.forEach((p: any) => {
                example[p.name.text] = this.getInitializerValue(p.initializer);
            });
        } else {
            example = this.getInitializerValue(argument);
        }
        this.debugger('Example extracted for %s: %j', this.getCurrentLocation(), example);
        return example;
    }

    protected getInitializerValue(initializer: any) {
        switch (initializer.kind as SyntaxKind) {
            case SyntaxKind.ArrayLiteralExpression:
                return initializer.elements.map((e: any) => this.getInitializerValue(e));
            case SyntaxKind.StringLiteral:
                return initializer.text;
            case SyntaxKind.TrueKeyword:
                return true;
            case SyntaxKind.FalseKeyword:
                return false;
            case SyntaxKind.NumberKeyword:
            case SyntaxKind.FirstLiteralToken:
                return parseInt(initializer.text, 10);
            case SyntaxKind.NullKeyword:
                return null;
            case SyntaxKind.ObjectLiteralExpression:
                const nestedObject: any = {};

                initializer.properties.forEach((p: any) => {
                    nestedObject[p.name.text] = this.getInitializerValue(p.initializer);
                });

                return nestedObject;
            default:
                return undefined;
        }
    }

    // -------------------------------------------

    protected getResponses(): ResponseType[] {
        const handler = Decorator.getRepresentationHandler('RESPONSE_DESCRIPTION', this.current.decoratorMap);
        const config = handler.matchToNodeDecorator(this.node);
        const args = handler.getPropertiesByTypes(config.id, ['STATUS_CODE', 'DESCRIPTION', 'PAYLOAD', 'TYPE']);

        if (!config.decorators || !config.decorators.length) { return []; }

        this.debugger('Generating Responses for %s', this.getCurrentLocation());

        return config.decorators.map(decorator => {
            const description = handler. getPropertyValueAsItem(decorator, args['DESCRIPTION']) || 'Ok';
            const status = handler. getPropertyValueAsItem(decorator, args['STATUS_CODE']) || '200';
            let examples = handler. getPropertyValueAsItem(decorator, args['PAYLOAD']);
            if(typeof examples !== 'undefined') {
                examples = this.getExamplesValue(examples);
            }

            const type = handler. getPropertyValueAsItem(decorator, args['TYPE']);

            const responses = {
                description: description,
                examples: examples,
                schema: type ? new TypeNodeResolver(type, this.current).resolve() : undefined,
                status: status
            };

            this.debugger('Generated Responses for %s: %j', this.getCurrentLocation(), responses);

            return responses;
        });
    }

    // -------------------------------------------

    public getProduces() {
        const handler = Decorator.getRepresentationHandler('RESPONSE_PRODUCES', this.current.decoratorMap);
        const config = handler.matchToNodeDecorator(this.node);

        const produces =  handler.getPropertyValueAsArray(config.decorator, handler.getPropertyByType(config.id));
        if(typeof produces === 'undefined' || produces.length === 0) {
            const acceptHandler = Decorator.getRepresentationHandler('REQUEST_ACCEPT', this.current.decoratorMap);
            const acceptConfig = acceptHandler.matchToNodeDecorator(this.node);
            return acceptHandler.getPropertyValueAsArray(acceptConfig.decorator, acceptHandler.getPropertyByType(acceptConfig.id));
        }

        return produces;
    }

    public getConsumes() {
        const handler = Decorator.getRepresentationHandler('REQUEST_CONSUMES', this.current.decoratorMap);
        const config = handler.matchToNodeDecorator(this.node);

        return handler.getPropertyValueAsArray(config.decorator, handler.getPropertyByType(config.id));
    }

    public getTags() {
        const handler = Decorator.getRepresentationHandler('SWAGGER_TAGS', this.current.decoratorMap);
        const config = handler.matchToNodeDecorator(this.node);

        return handler.getPropertyValueAsArray(config.decorator, handler.getPropertyByType(config.id));
    }

    // -------------------------------------------

    protected abstract getCurrentLocation(): string;

    // -------------------------------------------
}
