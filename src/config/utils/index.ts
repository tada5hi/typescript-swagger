import {readFile as fsReadFile} from "fs";
import {join as pathJoin} from 'path';
import {parse as yamlParse} from "yamljs";
import {hasOwnProperty} from "../../metadata/resolver/utils";
import {extendSwaggerConfig} from "../../swagger/config/utils";
import {Config} from "../type";
import {parseConfig} from "./validator";

/**
 * Return parsed configuration file from given file location.
 *
 * @param workingDir
 * @param fileName
 */
export async function getConfig(workingDir: string, fileName = 'swagger.json'): Promise<Config> {
    const data: unknown = await loadConfig(workingDir, fileName);

    const config = await parseConfig(data);
    if(typeof config.decorator !== 'undefined') {
        extendSwaggerConfig(workingDir, config.swagger);
    }

    return config;
}

/**
 * Load raw configuration file from given file location.
 *
 * @param workingDir
 * @param fileName
 */
export async function loadConfig(workingDir: string, fileName: string = 'swagger.json'): Promise<unknown> {
    const filePath : string = pathJoin(workingDir, fileName);

    const fileExtension: string = filePath.split('.').pop();

    if(fileExtension === 'js') {
        try {
            const data = await import(filePath);
            if(hasOwnProperty(data, 'default')) {
                return data.default();
            }

            return data;
        } catch (e) {
            throw new Error('Config file content could not be parsed...');
        }
    }

    return new Promise((resolve, reject) => {
        return fsReadFile(filePath, {encoding: 'utf-8'}, (err: Error, data: Buffer) => {
            if(err) {
                return reject(err);
            }

            const content = data.toString('utf-8');

            try {

                switch (fileExtension) {
                    case 'yml':
                    case 'yaml':
                        return resolve(yamlParse(content));
                    case 'json':
                        return resolve(JSON.parse(content));
                    default:
                        return reject(new Error('Invalid config file extension...'));
                }
            } catch (e) {
                return reject(new Error('Config file content could not be parsed...'));
            }
        });
    });
}
