'use strict';

import {castArray} from 'lodash';
import {ArrayLiteralExpression, isArrayLiteralExpression, Node, SyntaxKind, TypeNode} from 'typescript';
import {useDebugger} from "../debug";
import { getDecorators } from '../utils/decoratorUtils';
import {MetadataGenerator, ResponseType} from './metadataGenerator';
import {TypeNodeResolver} from './resolver';

export abstract class EndpointGenerator<T extends Node> {
    protected node: T;

    protected constructor(node: T, protected current: MetadataGenerator) {
        this.node = node;
    }

    protected debugger = useDebugger();

    protected getDecoratorValues(decoratorName: string, acceptMultiple: boolean = false) {
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

    protected getResponses(genericTypeMap?: Map<String, TypeNode>): Array<ResponseType> {
        const decorators = getDecorators(this.node, decorator => decorator.text === 'Response');
        if (!decorators || !decorators.length) { return []; }
        this.debugger('Generating Responses for %s', this.getCurrentLocation());

        return decorators.map(decorator => {
            let description = '';
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


    protected abstract getCurrentLocation(): string;
}
