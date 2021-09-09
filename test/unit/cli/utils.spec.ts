import * as path from "path";
import {
    getCompilerOptions,
    getPackageJsonStringValue
} from "../../../src/cli/utils";
import {getConfig} from "../../../src/config/utils";

describe('utils.ts', () => {
    it('package json string value', () => {
        const cwd = process.cwd();
        const swaggerPath = path.join(cwd, './test/data/');

        expect(getPackageJsonStringValue(swaggerPath, 'name')).toBe('typescript-swagger');
        expect(getPackageJsonStringValue(swaggerPath, 'abc')).toBe('');
        expect(getPackageJsonStringValue(swaggerPath, 'abc', 'abc')).toBe('abc');

        expect(getPackageJsonStringValue(path.join(swaggerPath, 'non-existing'), 'abc')).toBe('');
    });

    it('get and parse config', async () => {
        const cwd = process.cwd();
        const swaggerPath = path.join(cwd, './test/data/config/');

        const config = await getConfig(swaggerPath);

        expect(config.swagger.yaml).toBeTruthy();
        expect(await getConfig(swaggerPath, 'swagger-cjs.js')).toBeTruthy();
    });

    // todo: async error handling
    /*
    it('validate swagger config - errors', () => {
        const cwd = process.cwd();
        const swaggerPath = path.join(cwd, './test/data/');

        expect(() => parseConfig({
            swagger: {
                outputDirectory: swaggerPath
            }
        } as Config)).toThrow();
        expect(() => parseConfig({
            metadata: {
                entryFile: swaggerPath
            }
        } as Config)).toThrow();
        expect(parseConfig({
            swagger: {
                outputDirectory: swaggerPath
            },
            metadata: {
                entryFile: swaggerPath
        }} as Config)).toBeDefined();
    });

     */

    it('get compiler options', () => {
        const compilerOptions = getCompilerOptions( './test/data/tsconfig.json');

        expect(compilerOptions).toBeDefined();
        expect(compilerOptions.allowJs).toBeTruthy();

        expect(getCompilerOptions(path.join(process.cwd(), './test/data/tsconfig.json'))).toBeDefined();
        expect(() => getCompilerOptions('./test/data/non-existing/tsconfig.json')).toThrow();
    });
});
