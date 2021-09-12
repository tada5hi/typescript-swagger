import * as path from "path";
import {CompilerOptions} from "typescript";
import {Config} from "../../../src/config/type";
import {createMetadataGenerator} from "../../../src/metadata/utils";
import {createSpecGenerator} from "../../../src/swagger/generator/utils";
import {getDefaultSwaggerTestConfig} from "../../data/defaultOptions";
import {buildLibraryTests} from "../../decorator/library/utils";

const config : Config = {
    decorator: {
        useBuildIn: true,
        useLibrary: 'typescript-rest'
    },
    metadata: {
        entryFile: ['./test/decorator/library/typescript-rest/api.ts'],
        cache: path.join(process.cwd(), 'writable')
    },
    swagger: {
        ...getDefaultSwaggerTestConfig(),
        ...{
            outputDirectory: undefined,
            yaml: true
        }
    }
};

const tsConfig : CompilerOptions = {
    baseUrl: '.',
    paths: {
        '@/*': ['test/data/*'],
    }
};

const metadataGenerator = createMetadataGenerator(config, tsConfig);

const metadata = metadataGenerator.generate();

const specGenerator = createSpecGenerator(config, metadata);

buildLibraryTests(specGenerator, {
    title: 'typescript-rest'
});


