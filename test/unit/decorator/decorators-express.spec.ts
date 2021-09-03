import {buildLibraryTests, createSwaggerSpecGenerator} from "../../decorator/library/utils";

const specGenerator = createSwaggerSpecGenerator('@decorators/express', ['./test/decorator/library/@decorators-express/api.ts']);
buildLibraryTests(specGenerator, {
    title: '@decorators/express'
});
