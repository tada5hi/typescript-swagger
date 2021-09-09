import {Swagger} from "../../src/swagger/type/index";

export function getDefaultSwaggerTestConfig(): Swagger.Config {
    return {
        basePath: '/',
        collectionFormat: 'multi',
        description: 'Description of a test API',
        host: 'localhost:3000',
        license: 'MIT',
        name: 'Test API',
        version: '1.0.0',
        yaml: false
    };
}
