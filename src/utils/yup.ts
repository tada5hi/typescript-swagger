import {BaseSchema} from "yup";
import Lazy from "yup/lib/Lazy";
import Reference from "yup/lib/Reference";
import {AnySchema} from "yup/lib/schema";

export function mapYupRuleForDictionary<T>(map: any, rule: T) : Record<string, AnySchema | Reference | Lazy<any, any>> {
    return Object.keys(map).reduce((newMap, key) => ({
        ...newMap,
        [key]: rule
    }), {});
}

export function mergeYupSchemas(...schemas: BaseSchema[]) {
    const [first, ...rest] = schemas;

    return rest.reduce(
        (mergedSchemas, schema) => mergedSchemas.concat(schema),
        first
    );
}
