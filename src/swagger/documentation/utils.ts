import {CompilerOptions} from "typescript";
import {Config} from "../../config/type";
import {createMetadataGenerator} from "../../metadata/utils";
import {createSpecGenerator} from "../generator/index";
import {SwaggerDocumentationFormatData, SwaggerDocumentationFormatType} from "./type";

export async function generateDocumentation(
    config: Config,
    tsConfig?: CompilerOptions | boolean
): Promise<Record<SwaggerDocumentationFormatType, SwaggerDocumentationFormatData>> {
    const metadataGenerator = createMetadataGenerator(config, tsConfig);

    const metadata = metadataGenerator.generate();

    const specGenerator = createSpecGenerator(config, metadata);

    specGenerator.build();
    return await specGenerator.save();
}

