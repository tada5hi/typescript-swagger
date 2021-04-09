import {readJSONSync} from "fs-extra-promise";
import {endsWith} from "lodash";
import {isAbsolute, join} from "path";
import {CompilerOptions, convertCompilerOptionsFromJson} from "typescript";
import {load} from "yamljs";
import {Config, Specification, SwaggerConfig} from "../config";

let projectPackageJson : Record<string, any> | undefined;

export function getPackageJsonStringValue(workingDir: string, key: string, defaultValue: string = ''): string {
    try {
        if (typeof projectPackageJson === 'undefined') {
            projectPackageJson = require(`${workingDir}/package.json`);
        }

        return projectPackageJson[key] || defaultValue;
    } catch (e) {
        return defaultValue;
    }
}

export function getSwaggerConfig(workingDir: string, configPath = 'swagger.json'): Config {
    const configFile = `${workingDir}/${configPath}`;
    if (endsWith(configFile, '.yml') || endsWith(configFile, '.yaml')) {
        return load(configFile);
    } else if (endsWith(configFile, '.js')) {
        return require(join(configFile));
    } else {
        return readJSONSync(configFile);
    }
}

export function validateSwaggerConfig(workingDir: string, conf: SwaggerConfig): SwaggerConfig {
    if (!conf.outputDirectory) {
        throw new Error('Missing outputDirectory: onfiguration most contain output directory');
    }

    if (!conf.entryFile) {
        throw new Error('Missing entryFile: Configuration must contain an entry point file.');
    }

    conf.version = conf.version || getPackageJsonStringValue(workingDir, 'version', '0.0.1');
    conf.name = conf.name || getPackageJsonStringValue(workingDir, 'name');
    conf.description = conf.description || getPackageJsonStringValue(workingDir, 'description');
    conf.license = conf.license || getPackageJsonStringValue(workingDir, 'license', 'MIT');
    conf.yaml = conf.yaml !== false;
    conf.outputFormat = conf.outputFormat ? Specification[conf.outputFormat] : Specification.Swagger_2;

    return conf;
}

export function getCompilerOptions(loadTsconfig: boolean, tsconfigPath?: string | null): CompilerOptions {
    if (!loadTsconfig && tsconfigPath) {
        loadTsconfig = true;
    }
    if (!loadTsconfig) {
        return {};
    }
    const cwd = process.cwd();
    const defaultTsconfigPath = join(cwd, 'tsconfig.json');
    tsconfigPath = tsconfigPath
        ? getAbsolutePath(tsconfigPath, cwd)
        : defaultTsconfigPath;
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
