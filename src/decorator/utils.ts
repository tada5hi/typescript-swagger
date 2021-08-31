import {isCallExpression, isNumericLiteral, isStringLiteral, Node} from 'typescript';
import {Decorator} from "./type";

/**
 * Get Decorators for a specific node.
 *
 * @param node
 * @param isMatching
 */
export function getDecorators(node: Node, isMatching?: (data: Decorator.Data) => boolean): Decorator.Data[] {
    const decorators = node.decorators;
    if (!decorators || !decorators.length) { return []; }

    const items = decorators
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

            return result as Decorator.Data;
        });

    return typeof isMatching === 'undefined' ? items : items.filter(isMatching);
}
