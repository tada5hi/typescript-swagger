import {array, lazy, object, SchemaOf, string} from "yup";
import {Metadata} from "../type";

let validatorInstance : undefined | SchemaOf<Metadata.Config>;

export function useMetadataConfigValidator() : SchemaOf<Metadata.Config> {
    if(typeof validatorInstance !== 'undefined') {
        return validatorInstance;
    }

    validatorInstance = object({
        entryFile: lazy(value =>  {
            if(typeof value === 'string') {
                return string().required();
            }

            return array().of(string()).required().min(1);
        }),
        ignore: array(string()).optional().default(undefined)
    }) as unknown as SchemaOf<Metadata.Config>;

    return validatorInstance;
}
