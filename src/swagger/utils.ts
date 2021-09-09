import {CompilerOptions} from "typescript";
import {Config} from "../config";
import {createSpecGenerator} from "./generator";

export type SwaggerOutputFormatType = 'yaml' | 'json';
export interface SwaggerOutputFormatData {
    filePath: string;
    fileName: string;
}

export async function generateDocumentation(
    config: Config,
    tsConfig?: CompilerOptions | boolean
): Promise<Record<SwaggerOutputFormatType, SwaggerOutputFormatData>> {
    const specGenerator = createSpecGenerator(config, tsConfig);

    specGenerator.build();
    return await specGenerator.save();
}

