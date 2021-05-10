import {buildLibraryTests, createSwaggerSpecGenerator} from "../utils";

export function buildLibraryTypescriptRestTests() {
    const spec = createSwaggerSpecGenerator('typescript-rest', ['./test/library/typescript-rest/api.ts']);
    return buildLibraryTests(spec);
}
