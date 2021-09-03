import {createSwaggerSpecGenerator} from "../../decorator/library/utils";

const specGenerator = createSwaggerSpecGenerator(['typescript-rest'], ['./test/decorator/internal/api.ts']);
const spec = specGenerator.getSwaggerSpec();

describe('Internal', () => {
    it('should generate paths for decorated services', () => {
        expect(spec.paths).toHaveProperty('/mypath');
    });
});
