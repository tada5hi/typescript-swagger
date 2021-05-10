import * as path from "path";
import {SwaggerConfig} from "../../../src";
import {
    getCompilerOptions,
    getPackageJsonStringValue,
    getSwaggerConfig,
    validateSwaggerConfig
} from "../../../src/cli/utils";

describe('utils.ts', () => {
    it('package json string value', () => {
        const cwd = process.cwd();
        const swaggerPath = path.join(cwd, './test/data/');

        expect(getPackageJsonStringValue(swaggerPath, 'name')).toBe('typescript-swagger');
        expect(getPackageJsonStringValue(swaggerPath, 'abc')).toBe('');
        expect(getPackageJsonStringValue(swaggerPath, 'abc', 'abc')).toBe('abc');

        expect(getPackageJsonStringValue(path.join(swaggerPath, 'non-existing'), 'abc')).toBe('');
    });

    it('get swagger config', () => {
        const cwd = process.cwd();
        const swaggerPath = path.join(cwd, './test/data/');

        const swaggerConfig = getSwaggerConfig(swaggerPath);
        expect(swaggerConfig.swagger.yaml).toBeTruthy();

        expect(() => getSwaggerConfig(swaggerPath, 'swagger.yml')).toThrow();
        expect(getSwaggerConfig(swaggerPath, 'swagger.js')).toBeTruthy();
    });

    it('validate swagger config - errors', () => {
        const cwd = process.cwd();
        const swaggerPath = path.join(cwd, './test/data/');

        expect(() => validateSwaggerConfig(swaggerPath, {outputDirectory: swaggerPath} as SwaggerConfig)).toThrow();
        expect(() => validateSwaggerConfig(swaggerPath, {entryFile: swaggerPath} as SwaggerConfig)).toThrow();
        expect(validateSwaggerConfig(swaggerPath, {outputDirectory: swaggerPath, entryFile: swaggerPath} as SwaggerConfig)).toBeDefined();
    });

    it('get compiler options', () => {
        expect(getCompilerOptions(false)).toEqual({});

        const compilerOptions = getCompilerOptions(false, './test/data/tsconfig.json');

        expect(compilerOptions).toBeDefined();
        expect(compilerOptions.allowJs).toBeTruthy();

        expect(getCompilerOptions(false, path.join(process.cwd(), './test/data/tsconfig.json'))).toBeDefined();
        expect(() => getCompilerOptions(false, './test/data/non-existing/tsconfig.json')).toThrow();
    });
});
