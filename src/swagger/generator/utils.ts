// todo: implement character in regex matching
import {CompilerOptions} from "typescript";
import {getCompilerOptions} from "../../cli/utils";
import {Config} from "../../config/type";
import {MetadataGenerator} from "../../metadata";
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
    src: Config | MetadataGenerator,
    compilerOptions?: CompilerOptions | boolean
) {
    let metadata: MetadataGenerator | undefined;

    if (src instanceof MetadataGenerator) {
        metadata = src;
    } else {
        const skipLoad: boolean =
            (typeof compilerOptions === 'boolean' && !compilerOptions) ||
            (typeof compilerOptions !== 'boolean' && typeof compilerOptions !== 'undefined');

        let tscConfig: CompilerOptions = typeof compilerOptions !== 'boolean' && typeof compilerOptions !== 'undefined' ? compilerOptions : {};

        if (!skipLoad) {
            try {
                tscConfig ??= getCompilerOptions();
            } catch (e) {
                tscConfig = {};
            }
        }

        metadata = new MetadataGenerator(src, tscConfig);
    }

    let specGenerator: SpecGenerator<any, any>;

    const output: Metadata.Output = metadata.generate();

    const outputFormat : Swagger.Specification = metadata.config.swagger.outputFormat || Swagger.Specification.VERSION_2;

    switch (outputFormat) {
        case Swagger.Specification.VERSION_2:
            specGenerator = new Version2SpecGenerator(output, metadata.config.swagger);
            break;
        case Swagger.Specification.VERSION_3:
            specGenerator = new Version3SpecGenerator(output, metadata.config.swagger);
            break;
    }

    return specGenerator;
}
