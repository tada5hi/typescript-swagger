import {isCallExpression, isNumericLiteral, isStringLiteral, Node} from 'typescript';

export function getDecorators(node: Node, isMatching: (identifier: DecoratorData) => boolean): Array<DecoratorData> {
    const decorators = node.decorators;
    if (!decorators || !decorators.length) { return []; }

    return decorators
        .map(d => {
            const result: any = {
                arguments: [],
                typeArguments: []
            };
            let x: any = d.expression;
            if (isCallExpression(x)) {
                if (x.arguments) {
                    result.arguments = x.arguments.map((argument: any) => {
                        if (isStringLiteral(argument) || isNumericLiteral(argument)) {
                            return argument.text;
                        } else {
                            return argument;
                        }
                    });
                }

                if (x.typeArguments) {
                    result.typeArguments = x.typeArguments;
                }

                x = x.expression;
            }

            result.text = x.text || x.name.text;

            return result as DecoratorData;
        })
        .filter(isMatching);
}

function getDecorator(node: Node, isMatching: (identifier: DecoratorData) => boolean) {
    const decorators = getDecorators(node, isMatching);
    if (!decorators || !decorators.length) { return undefined; }

    return decorators[0];
}

export function getDecoratorName(node: Node, isMatching: (identifier: DecoratorData) => boolean) {
    const decorator = getDecorator(node, isMatching);
    return decorator ? decorator.text : undefined;
}

export function getDecoratorTextValue(node: Node, isMatching: (identifier: DecoratorData) => boolean) {
    const decorator = getDecorator(node, isMatching);
    return decorator && typeof decorator.arguments[0] === 'string' ? decorator.arguments[0] as string : undefined;
}

export function getDecoratorOptions(node: Node, isMatching: (identifier: DecoratorData) => boolean) {
    const decorator = getDecorator(node, isMatching);
    return decorator && typeof decorator.arguments[1] === 'object' ? decorator.arguments[1] as { [key: string]: any } : undefined;
}

export function isDecorator(node: Node, isMatching: (identifier: DecoratorData) => boolean) {
    const decorators = getDecorators(node, isMatching);
    return !(!decorators || !decorators.length);
}

export interface DecoratorData {
    text: string;
    arguments: Array<any>;
    typeArguments: Array<any>;
}
