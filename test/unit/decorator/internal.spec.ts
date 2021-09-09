import * as path from "path";
import {createSpecGenerator} from "../../../src";

const specGenerator = createSpecGenerator(
    {
        decorator: {
            useBuildIn: true,
            useLibrary: 'typescript-rest'
        },
        metadata: {
            entryFile: ['./test/decorator/internal/api.ts'],
        },
        swagger: {
            outputDirectory: path.resolve(__dirname),
            yaml: true
        }
    },
    {
        baseUrl: '.',
        paths: {
            '@/*': ['test/data/*'],
        },
    }
);

specGenerator.save().then(r => r);

const spec = specGenerator.getSwaggerSpec();

describe('Internal', () => {
    it('should generate paths for decorated services', () => {
        expect(spec.paths).toHaveProperty('/mypath');
    });
});
