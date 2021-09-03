#!/usr/bin/env node
'use strict';

import {ArgumentParser} from 'argparse';
import {Debugger} from 'debug';
import {Specification} from "../config";
import {useDebugger} from "../debug";
import {MetadataGenerator} from '../metadata';
import {Version2SpecGenerator} from "../swagger/generator/v2";
import {Version3SpecGenerator} from "../swagger/generator/v3";
import {getCompilerOptions, getSwaggerConfig, validateSwaggerConfig} from "./utils";


const packageJson = require('../../package.json');

const debugLog : Debugger = useDebugger();
const workingDir: string = process.cwd();

const parser = new ArgumentParser({
    addHelp: true,
    description: 'Typescript Swagger tool',
    version: packageJson.version
});

parser.addArgument(
    ['-c', '--config'],
    {
        help: 'The swagger config file (swagger.json or swagger.yml or swaggerConfig.js).'
    }
);

parser.addArgument(
    ['-t', '--tsconfig'],
    {
        action: 'storeTrue',
        defaultValue: false,
        help: 'Load tsconfig.json file',
    }
);

parser.addArgument(
    ['-p', '--tsconfig_path'],
    {
        help: 'The tsconfig file (tsconfig.json) path. Default to {cwd}/tsconfig.json.',
    }
);

const parameters = parser.parseArgs();

try {
    const config = getSwaggerConfig(workingDir, parameters.config);

    const compilerOptions = getCompilerOptions(parameters.tsconfig, parameters.tsconfig_path);
    debugLog('Starting Swagger generation tool');
    debugLog('Compiler Options: %j', compilerOptions);

    const swaggerConfig = validateSwaggerConfig(workingDir, config.swagger);
    debugLog('Swagger Config: %j', swaggerConfig);

    debugLog('Processing Services Metadata');
    const metadata = new MetadataGenerator(config, compilerOptions).generate();
    debugLog('Generated Metadata: %j', metadata);

    let specGenerator : Version2SpecGenerator | Version3SpecGenerator;
    switch (config.swagger.outputFormat) {
        case Specification.Swagger_2:
            specGenerator = new Version2SpecGenerator(metadata, swaggerConfig);
            break;
        case Specification.OpenApi_3:
            specGenerator = new Version3SpecGenerator(metadata, swaggerConfig);
            break;

    }

    specGenerator.build();

    specGenerator.save()
        .then(() => {
            console.log('Swagger file(s) saved to disk.');
        })
        .catch((err: any) => {
            console.log(`Error saving generating swagger. ${err}`);
        });

} catch (e) {
    console.log('Swagger config not found. Did you specify the path to the swagger config file?');
    process.exit(1);
}


