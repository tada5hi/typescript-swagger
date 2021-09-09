import {object, SchemaOf} from "yup";
import {useDecoratorConfigValidator} from "../../decorator/utils/validator";
import {useMetadataConfigValidator} from "../../metadata/utils/validator";
import {useSwaggerConfigValidator} from "../../swagger/config/utils/validator";
import {Config} from "../type";

let validatorInstance: undefined | SchemaOf<Config>;

export function useConfigValidator(): SchemaOf<Config> {
    if (typeof validatorInstance !== 'undefined') {
        return validatorInstance;
    }

    validatorInstance = object({
        metadata: useMetadataConfigValidator(),
        swagger: useSwaggerConfigValidator(),
        decorator: useDecoratorConfigValidator()
    });

    return validatorInstance;
}

export async function parseConfig(value: unknown): Promise<Config> {
    const validator = useConfigValidator();

    await validator.validate(value);

    return validator.cast(value) as Config;
}
