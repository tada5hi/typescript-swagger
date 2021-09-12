import * as path from "path";
import {CompilerOptions} from "typescript";
import {Config, createSpecGenerator} from "../../../src";
import {createMetadataGenerator} from "../../../src/metadata/utils";
import {getDefaultSwaggerTestConfig} from "../../data/defaultOptions";
import {buildLibraryTests} from "../../decorator/library/utils";

const config : Config = {
    decorator: {
        useBuildIn: true,
        useLibrary: '@decorators/express'
    },
    metadata: {
        entryFile: ['./test/decorator/library/@decorators-express/api.ts'],
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

const specGenerator = createSpecGenerator(config, metadataGenerator);

buildLibraryTests(specGenerator, {
    title: '@decorators/express'
});
