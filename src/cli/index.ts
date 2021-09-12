#!/usr/bin/env node
'use strict';

import {ArgumentParser} from 'argparse';
import {Debugger} from 'debug';
import {CompilerOptions} from "typescript";
import {Config} from "../config";
import {getConfig} from "../config/utils";
import {useDebugger} from "../debug";
import {createMetadataGenerator} from "../metadata/utils";
import {createSpecGenerator} from "../swagger";
import {getCompilerOptions} from "./utils";


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
        defaultValue: true,
        help: 'Load the tsconfig.json file. Read the README.md for more information.'
    }
);

const parameters = parser.parseArgs();

(async () => {
    try {
        const config : Config = await getConfig(workingDir, parameters.config);
        debugLog('Starting generation tool...');

        debugLog('Processing Services Metadata');
        const isBoolean : boolean = parameters.tsconfig === 'true' || parameters.tsconfig === 'false' || typeof parameters.tsconfig === 'boolean';
        const isPath : boolean = !isBoolean && typeof parameters.tsconfig === 'string';

        let compilerOptions : boolean | CompilerOptions | undefined;
        if(isPath) {
            compilerOptions = getCompilerOptions(parameters.tsconfig as string);
        }

        if(isBoolean) {
            const isFalse : boolean = parameters.tsconfig === 'false' || !parameters.tsconfig;
            compilerOptions = !isFalse;
        }

        const metadataGenerator = createMetadataGenerator(config, compilerOptions);

        const metadata = metadataGenerator.generate();

        const specGenerator = createSpecGenerator(config, metadata);

        specGenerator.build();

        specGenerator.save()
            .then(() => {
                console.log('Swagger file(s) saved to disk.');
                process.exit(0);
            })
            .catch((err: any) => {
                console.log(`Error saving generating swagger. ${err}`);
                process.exit(1);
            });

    } catch (e) {
        console.log('Swagger config not found. Did you specify the path to the swagger config file?');
        process.exit(1);
    }
})();



