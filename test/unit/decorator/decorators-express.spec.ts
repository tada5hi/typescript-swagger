import {createSpecGenerator} from "../../../src";
import {getDefaultSwaggerTestConfig} from "../../data/defaultOptions";
import {buildLibraryTests} from "../../decorator/library/utils";

const specGenerator = createSpecGenerator(
    {
        decorator: {
            useBuildIn: true,
            useLibrary: '@decorators/express'
        },
        metadata: {
            entryFile: ['./test/decorator/library/@decorators-express/api.ts'],
        },
        swagger: {
            ...getDefaultSwaggerTestConfig(),
            ...{
                outputDirectory: undefined,
                yaml: true
            }
        }
    },
    {
        baseUrl: '.',
        paths: {
            '@/*': ['test/data/*'],
        },
    }
);

buildLibraryTests(specGenerator, {
    title: '@decorators/express'
});
