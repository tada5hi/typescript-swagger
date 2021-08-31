import {hasOwnProperty} from "../../metadata/resolver/utils";
import {Decorator} from "../type";

/**
 *
 *
 * @param mapping
 * @param reducer
 */
export function reduceTypeRepresentationMapping(
    mapping: Decorator.TypeRepresentationMapping,
    reducer: (type: Decorator.Type) => boolean
): Decorator.TypeRepresentationMapping {
    const mappingKeys: Decorator.Type[] = (Object.keys(mapping) as Decorator.Type[]);
    const allowedTypes: Decorator.Type[] = mappingKeys
        .filter(reducer);

    if (mappingKeys.length === allowedTypes.length) {
        return mapping;
    }

    const result: Decorator.TypeRepresentationMapping = {} as Decorator.TypeRepresentationMapping;
    for (let i = 0; i < allowedTypes.length; i++) {
        result[allowedTypes[i]] = mapping[allowedTypes[i]];
    }

    return result;
}

/**
 *
 *
 * @param type
 * @param config
 */
export function isMappingTypeIncluded(
    type: Decorator.Type,
    config: Decorator.ConfigMappingOption
): boolean {
    const allowedType = Object.prototype.toString.call(config);
    switch (allowedType) {
        case '[object Boolean]':
            return !!config;
        case '[object String]':
            return (config as string) === type;
        case '[object Array]':
            return (config as unknown as Decorator.Type[]).indexOf(type) !== -1;
        case '[object Object]':
            return hasOwnProperty((config as Record<Decorator.Type, boolean>), type) && (config as Record<Decorator.Type, boolean>)[type];
    }

    return false;
}
