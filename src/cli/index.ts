#!/usr/bin/env node
'use strict';

import {ArgumentParser} from 'argparse';
import debug, {Debugger} from 'debug';
import {MetadataGenerator} from '../metadata/metadataGenerator';
import {SpecGenerator} from '../swagger/generator';
import {getCompilerOptions, getSwaggerConfig, validateSwaggerConfig} from "./utils";


const packageJson = require('../../package.json');

const debugLog : Debugger = debug(packageJson.name);
const workingDir: string = process.cwd();

const parser = new ArgumentParser({
    addHelp: true,
    description: 'Typescript Swagger tool',
    version: packageJson.version
});

parser.addArgument(
    ['-c', '--config'],
    {
        help: 'The swagger config file (swagger.json or swagger.yml or swaggerCongig.js).'
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
const config = getSwaggerConfig(workingDir, parameters.config);
const compilerOptions = getCompilerOptions(parameters.tsconfig, parameters.tsconfig_path);
debugLog('Starting Swagger generation tool');
debugLog('Compiler Options: %j', compilerOptions);

const swaggerConfig = validateSwaggerConfig(workingDir, config.swagger);
debugLog('Swagger Config: %j', swaggerConfig);

debugLog('Processing Services Metadata');
const metadata = new MetadataGenerator(swaggerConfig.entryFile, compilerOptions, swaggerConfig.ignore).generate();
debugLog('Generated Metadata: %j', metadata);

new SpecGenerator(metadata, swaggerConfig).generate()
    .then(() => {
        debugLog('Generation completed.');
    })
    .catch((err: any) => {
        debugLog(`Error generating swagger. ${err}`);
    });

