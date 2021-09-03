import {CompilerOptions} from "typescript";
import {Config, Specification} from "../config";
import {MetadataGenerator} from "../metadata";
import {SpecGenerator} from "./generator";
import {Version2SpecGenerator} from "./generator/v2";
import {Version3SpecGenerator} from "./generator/v3";

export type SwaggerOutputFormatType = 'yaml' | 'json';
export interface SwaggerOutputFormatData {
    filePath: string;
    fileName: string;
}

export async function generateDocumentation(
    config: Config,
    tsConfig: CompilerOptions
): Promise<Record<SwaggerOutputFormatType, SwaggerOutputFormatData>> {
    const metadata = new MetadataGenerator(config, tsConfig).generate();

    let specGenerator : SpecGenerator<any, any>;

    switch (config.swagger.outputFormat) {
        case Specification.Swagger_2:
            specGenerator = new Version2SpecGenerator(metadata, config.swagger);
            break;
        case Specification.OpenApi_3:
            specGenerator = new Version3SpecGenerator(metadata, config.swagger);
            break;
    }

    specGenerator.build();
    return await specGenerator.save();
}
