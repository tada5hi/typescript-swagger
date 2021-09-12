// todo: implement character in regex matching
import {Config} from "../../config/type";
import {MetadataGenerator} from "../../metadata/index";
import {Metadata} from "../../metadata/type";
import {Swagger} from "../type/index";
import {SpecGenerator} from "./index";
import {Version2SpecGenerator} from "./v2";
import {Version3SpecGenerator} from "./v3";

export function removeRepeatingCharacter(str: string, character: string) : string {
    return str.replace('/([^:]\$)\/+/g', "$1");
}

export function removeFinalCharacter(str: string, character: string) {
    while(str.charAt(str.length - 1) === character && str.length > 0) {
        str = str.slice(0, -1);
    }

    return str;
}

export function createSpecGenerator(
    config: Config,
    metadata: Metadata.Output | MetadataGenerator
) {
    const data : Metadata.Output = metadata instanceof MetadataGenerator ? metadata.generate() : metadata;

    const outputFormat : Swagger.Specification = config.swagger.outputFormat || Swagger.Specification.VERSION_2;

    let specGenerator : SpecGenerator<any, any>;

    switch (outputFormat) {
        case Swagger.Specification.VERSION_2:
            specGenerator = new Version2SpecGenerator(data, config.swagger);
            break;
        case Swagger.Specification.VERSION_3:
            specGenerator = new Version3SpecGenerator(data, config.swagger);
            break;
    }

    return specGenerator;
}
