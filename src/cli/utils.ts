import {isAbsolute, join} from "path";
import {CompilerOptions, convertCompilerOptionsFromJson} from "typescript";

let projectPackageJsonpath : string | undefined;
let projectPackageJson : Record<string, any> | undefined;

export function getPackageJsonStringValue(workingDir: string, key: string, defaultValue: string = ''): string {
    const path = join(workingDir, 'package.json');

    try {
        if (
            typeof projectPackageJson === 'undefined' ||
            typeof projectPackageJsonpath === 'undefined' ||
            projectPackageJsonpath !== path
        ) {
            projectPackageJson = require(path);
        }

        projectPackageJsonpath = path;

        return projectPackageJson[key] || defaultValue;
    } catch (e) {
        return defaultValue;
    }
}

export function getCompilerOptions(tsconfigPath?: string | null): CompilerOptions {
    const cwd = process.cwd();
    tsconfigPath = tsconfigPath
        ? getAbsolutePath(tsconfigPath, cwd)
        : join(cwd, 'tsconfig.json');
    try {
        const tsConfig = require(tsconfigPath);
        if (!tsConfig) {
            throw new Error('Invalid tsconfig');
        }
        return tsConfig.compilerOptions
            ? convertCompilerOptionsFromJson(tsConfig.compilerOptions, cwd).options
            : {};
    } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
            throw Error(`No tsconfig file found at '${tsconfigPath}'`);
        } else if (err.name === 'SyntaxError') {
            throw Error(`Invalid JSON syntax in tsconfig at '${tsconfigPath}': ${err.message}`);
        } else {
            throw Error(`Unhandled error encountered loading tsconfig '${tsconfigPath}': ${err.message}`);
        }
    }
}

function getAbsolutePath(p: string, basePath: string): string {
    if (isAbsolute(p)) {
        return p;
    } else {
        return join(basePath, p);
    }
}
