import {CompilerOptions} from "typescript";
import {getCompilerOptions} from "../cli/utils";
import {Config} from "../config/type";
import {MetadataGenerator} from "./index";

export function createMetadataGenerator(
    config: Config,
    compilerOptions?: CompilerOptions | boolean
) : MetadataGenerator {
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

    return new MetadataGenerator(config, tscConfig);
}
