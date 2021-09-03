import {Decorator} from "../../type";

export function extendRepresentationPropertyConfig(property: Decorator.Property): Decorator.Property {
    if (typeof property.type === 'undefined') {
        property.type = 'element';
    }

    if (typeof property.srcArgumentType === 'undefined') {
        property.srcArgumentType = 'argument';
    }

    if (typeof property.srcPosition === 'undefined') {
        property.srcPosition = 0;
    }

    return property;
}

export function extractRepresentationPropertyValue<
    T extends Decorator.Type,
    P extends keyof Decorator.TypePropertyMaps[T]
>(
    decorator: Decorator.Data,
    config: Decorator.Property
): Decorator.TypePropertyMaps[T][P] | undefined {
    const srcPosition : number = config.srcPosition ?? 0;
    const srcAmount : number = config.srcAmount;

    let items : unknown[] = [];

    switch (config.srcArgumentType) {
        case 'typeArgument':
            items = decorator.typeArguments;
            break;
        case "argument":
            items = decorator.arguments;
            break;
    }

    switch (config.type) {
        case "src":
            if(srcAmount === 1 || typeof srcAmount === 'undefined') {
                return items[srcPosition] as Decorator.TypePropertyMaps[T][P];
            } else {
                return items.slice(srcPosition, srcAmount) as unknown as Decorator.TypePropertyMaps[T][P];
            }
        case "element":
            if (items.length > srcPosition) {
                if(srcAmount === 1 || typeof srcAmount === 'undefined') {
                    return items[srcPosition] as Decorator.TypePropertyMaps[T][P];
                } else {
                    const data : unknown[] = items.slice(srcPosition, srcAmount);

                    if(data.length === 0 || typeof data[0] !== 'object') {
                        return undefined;
                    }

                    if(config.srcObjectStrategy === 'merge') {
                        let output : Record<string, any> = {};
                        for(let i=0; i<data.length; i++) {
                            output = Object.assign(output, data[i]);
                        }

                        return output as Decorator.TypePropertyMaps[T][P];
                    }
                }
            }

            return undefined;
        case "array":
            if(
                typeof srcAmount === 'undefined' &&
                items.length > srcPosition
            ) {
                return (Array.isArray(items[srcPosition]) ? items[srcPosition] : [items[srcPosition]]) as unknown as Decorator.TypePropertyMaps[T][P];
            } else {
                const data : unknown[] | unknown[][] = typeof srcAmount === 'number' && srcAmount === -1 ? items : items.slice(srcPosition, srcAmount);

                if(data.length === 0 || typeof data[0] !== 'object') {
                    return [] as unknown as Decorator.TypePropertyMaps[T][P];
                }

                if(data.length === 1) {
                    return (Array.isArray(data[0]) ? data[0] : [data[0]]) as unknown as Decorator.TypePropertyMaps[T][P];
                }

                if(config.srcArrayStrategy === 'merge') {
                    let merged : unknown[] = [];
                    for(let i=0; i<data.length; i++) {
                        if(Array.isArray(data[i])) {
                            merged = [...merged, ...data[i] as unknown[]];
                        } else {
                            merged.push(data[i]);
                        }
                    }

                    return merged as unknown as Decorator.TypePropertyMaps[T][P];
                }

                if(typeof config.srcArrayStrategy === 'function') {
                    return config.srcArrayStrategy(data) as unknown as Decorator.TypePropertyMaps[T][P];
                }

                return [] as unknown as Decorator.TypePropertyMaps[T][P];
            }
    }

    return undefined;
}
