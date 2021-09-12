'use strict';

import {ArrayLiteralExpression, isArrayLiteralExpression, Node, SyntaxKind, TypeNode} from 'typescript';
import {useDebugger} from "../debug";
import {Decorator} from "../decorator/type";
import { getDecorators } from '../decorator/utils/index';
import {normalizePath} from "../utils/path";
import {MetadataGenerator} from './index';
import {TypeNodeResolver} from './resolver';
import {Metadata} from "./type";
import {isExistJSDocTag} from "./utils/js-doc";

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

    protected generatePath(
        key: Extract<Decorator.Type, 'CLASS_PATH' | 'METHOD_PATH'>
    ) : void {
        const values : string[] = [];

        const representation = this.current.decoratorMapper.match(key, this.node);
        if(typeof representation !== 'undefined') {
            const value = representation.getPropertyValue('DEFAULT');
            if(typeof value !== 'undefined') {
                values.push(value);
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

        return securities.map(security => {
            const rolesArray : string[] = security[0] ? this.handleRolesArray(security[0]) : [];

            return {
                name: security[1] ? security[1] : 'default',
                scopes: rolesArray
            };
        });
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

    protected getExamplesValue(argument: any) : unknown[] {
        let example: any = {};

        if(typeof argument === 'undefined') {
            return example;
        }

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

    protected getResponses(): Metadata.Response[] {
        const representation = this.current.decoratorMapper.match('RESPONSE_DESCRIPTION', this.node);
        if(typeof representation === 'undefined') {
            return [];
        }

        const responses : Metadata.Response[] = [];

        for(let i=0; i<representation.decorators.length; i++) {
            const description = representation.getPropertyValue('DESCRIPTION', i) || 'Ok';
            const status = representation. getPropertyValue('STATUS_CODE', i) || '200';
            let examples : unknown | unknown[] = representation. getPropertyValue('PAYLOAD', i);

            if(typeof examples !== 'undefined') {
                examples = this.getExamplesValue(examples);
            }

            const type = representation.getPropertyValue('TYPE');

            const response : Metadata.Response = {
                description: description,
                examples: examples,
                schema: type ? new TypeNodeResolver(type as TypeNode, this.current).resolve() : undefined,
                status: status as string,
                name: status as string
            };

            this.debugger('Generated Responses for %s: %j', this.getCurrentLocation(), responses);

            responses.push(response);
        }

        return responses;
    }

    // -------------------------------------------

    public getProduces() : string[] {
        const representation = this.current.decoratorMapper.match('RESPONSE_PRODUCES', this.node);
        if(typeof representation === 'undefined') {
            return [];
        }

        const value : string[] = representation.getPropertyValue('DEFAULT');
        if(typeof value === 'undefined') {
            return [];
        }

        return Array.isArray(value) ? value : [value];
    }

    public getConsumes() : string[] {
        const representation = this.current.decoratorMapper.match('REQUEST_CONSUMES', this.node);
        if(typeof representation === 'undefined') {
            return [];
        }

        let value : string[] = representation.getPropertyValue('DEFAULT');
        if(typeof value === 'undefined') {
            return [];
        }

        value = Array.isArray(value) ? value : [value];

        return value;
    }

    public getTags() : string[] {
        const representation = this.current.decoratorMapper.match('SWAGGER_TAGS', this.node);
        if(typeof representation === 'undefined') {
            return [];
        }

        let value : string[] = representation.getPropertyValue('DEFAULT');
        if(typeof value === 'undefined') {
            return [];
        }

        value = Array.isArray(value) ? value : [value];

        return value;
    }

    // -------------------------------------------

    protected abstract getCurrentLocation(): string;

    // -------------------------------------------

    public isHidden(node: Node) : boolean {
        return typeof this.current.decoratorMapper.match('HIDDEN', node) !== 'undefined';
    }

    public isDeprecated(node: Node) : boolean {
        if (isExistJSDocTag(node, tag => tag.tagName.text === 'deprecated')) {
            return true;
        }

        return typeof this.current.decoratorMapper.match('DEPRECATED', node) !== 'undefined';
    }
}
