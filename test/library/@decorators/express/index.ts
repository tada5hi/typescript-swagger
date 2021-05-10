import {buildLibraryTests, createSwaggerSpecGenerator} from "../../utils";

export function buildLibraryDecoratorsExpressTests() {
    const spec = createSwaggerSpecGenerator('@decorators/express', ['./test/library/@decorators/express/api.ts']);
    return buildLibraryTests(spec);
}
