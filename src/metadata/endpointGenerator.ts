'use strict';

import {castArray, union} from 'lodash';
import {ArrayLiteralExpression, isArrayLiteralExpression, Node, SyntaxKind} from 'typescript';
import {useDebugger} from "../debug";
import {Decorator} from "../decorator/type";
import { getDecorators } from '../utils/decoratorUtils';
import {normalizePath} from "../utils/pathUtils";
import {MetadataGenerator, ResponseType} from './metadataGenerator';
import {TypeNodeResolver} from './resolver';

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

    protected generatePath(key: Decorator.ID) {
        const values : Array<string> = [];

        const pathDecoratorKeys : Array<string> = Decorator.getIDRepresentations(key, this.current.decoratorMap);
        if(pathDecoratorKeys.length > 0) {
            const decorators = getDecorators(this.node, decorator => pathDecoratorKeys.indexOf(decorator.text) !== -1);
            for(let i=0; i<decorators.length; i++) {
                if(typeof decorators[i].arguments[0] === 'string') {
                    values.push(decorators[i].arguments[0]);
                }
            }
        }

        this.path = normalizePath(values.join('/'));
    }

    // --------------------------------------------------------------------

    protected getDecoratorValues(decoratorName: string, acceptMultiple: boolean = false) : Array<any> {
        const decorators = getDecorators(this.node, decorator => decorator.text === decoratorName);
        if (!decorators || !decorators.length) { return []; }
        if (!acceptMultiple && decorators.length > 1) {
            throw new Error(`Only one ${decoratorName} decorator allowed in ${this.getCurrentLocation()}.`);
        }
        let result: Array<any>;
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

    protected handleRolesArray(argument: ArrayLiteralExpression): Array<string> {
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

    protected getResponses(): Array<ResponseType> {
        const responseKeys : Array<string> = Decorator.getIDRepresentations('RESPONSE_DESCRIPTION', this.current.decoratorMap);
        const decorators = getDecorators(this.node, decorator => responseKeys.indexOf(decorator.text) !== -1);

        if (!decorators || !decorators.length) { return []; }
        this.debugger('Generating Responses for %s', this.getCurrentLocation());

        return decorators.map(decorator => {
            let description = 'Ok';
            let status = '200';
            let examples;
            if (decorator.arguments.length > 0 && decorator.arguments[0]) {
                status = decorator.arguments[0];
            }
            if (decorator.arguments.length > 1 && decorator.arguments[1]) {
                description = decorator.arguments[1] as any;
            }
            if (decorator.arguments.length > 2 && decorator.arguments[2]) {
                const argument = decorator.arguments[2] as any;
                examples = this.getExamplesValue(argument);
            }

            const responses = {
                description: description,
                examples: examples,
                schema: (decorator.typeArguments && decorator.typeArguments.length > 0)
                    ? new TypeNodeResolver(decorator.typeArguments[0], this.current).resolve()
                    : undefined,
                status: status
            };

            this.debugger('Generated Responses for %s: %j', this.getCurrentLocation(), responses);

            return responses;
        });
    }

    // -------------------------------------------

    public getProduces() {
        let produces : Array<any> = union(...Decorator.getIDRepresentations('RESPONSE_PRODUCES', this.current.decoratorMap).map(key => this.getDecoratorValues(key)));
        if(typeof produces === 'undefined' || produces.length === 0) {
            produces = union(...Decorator.getIDRepresentations('REQUEST_ACCEPT', this.current.decoratorMap).map(key => this.getDecoratorValues(key)));
        }

        return produces;
    }

    // -------------------------------------------

    protected abstract getCurrentLocation(): string;

    // -------------------------------------------
}
