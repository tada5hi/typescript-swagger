import {buildLibraryTests, createSwaggerSpecGenerator} from "../../decorator/library/utils";

const specGenerator = createSwaggerSpecGenerator('typescript-rest', ['./test/decorator/library/typescript-rest/api.ts']);
buildLibraryTests(specGenerator, {
    title: 'typescript-rest'
});


