import * as path from "path";
import {CompilerOptions} from "typescript";
import {Config, createSpecGenerator} from "../../../src";
import {createMetadataGenerator} from "../../../src/metadata/utils";
import {getDefaultSwaggerTestConfig} from "../../data/defaultOptions";

const config : Config = {
    decorator: {
        useBuildIn: true,
        useLibrary: 'typescript-rest'
    },
    metadata: {
        entryFile: ['./test/decorator/internal/api.ts'],
        cache: path.join(process.cwd(), 'writable')
    },
    swagger: {
        ...getDefaultSwaggerTestConfig(),
        ...{
            outputDirectory: path.join(process.cwd(), 'writable'),
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

const spec = specGenerator.getSwaggerSpec();

specGenerator.save().then(r => r).catch(e => console.log(e));

it('should generate paths for decorated services', () => {
    expect(spec.paths).toHaveProperty('/mypath');
});

