import {Debugger} from "debug";
import {promises, writeFile} from 'fs';
import {castArray, union} from 'lodash';
import {posix} from 'path';
import {CompilerOptions} from "typescript";
import {stringify} from 'yamljs';
import {Specification, SwaggerConfig} from '../config';
import {useDebugger} from "../debug";

import {Metadata, MetadataGenerator, Method, Parameter, Property, ResponseType} from '../metadata/metadataGenerator';
import {Resolver} from "../metadata/resolver/type";

import {Swagger} from './index';

export async function generateDocumentation(swaggerConfig: SwaggerConfig, tsConfig: CompilerOptions) : Promise<string> {
    const metadata = new MetadataGenerator(swaggerConfig.entryFile, tsConfig, swaggerConfig.ignore, swaggerConfig.decoratorConfig).generate();
    await new SpecGenerator(metadata, swaggerConfig).generate();

    return Array.isArray(swaggerConfig.outputDirectory) ? swaggerConfig.outputDirectory.join('/') : swaggerConfig.outputDirectory;
}

export class SpecGenerator {
    private debugger : Debugger = useDebugger();

    constructor(private readonly metadata: Metadata, private readonly config: SwaggerConfig) { }

    public async generate(): Promise<void> {
        this.debugger('Generating swagger files.');
        this.debugger('Swagger Config: %j', this.config);
        this.debugger('Services Metadata: %j', this.metadata);
        let spec: any = this.getSwaggerSpec();
        if (this.config.outputFormat === Specification.OpenApi_3) {
            spec = await this.convertToOpenApiSpec(spec);
        }
        return new Promise<void>((resolve, reject) => {
            const swaggerDirs = castArray(this.config.outputDirectory);
            this.debugger('Saving specs to folders: %j', swaggerDirs);
            swaggerDirs.forEach((swaggerDir: string) => {
                promises.mkdir(swaggerDir, {recursive: true}).then(() => {
                    this.debugger('Saving specs json file to folder: %j', swaggerDir);
                    writeFile(`${swaggerDir}/swagger.json`, JSON.stringify(spec, null, '\t'), (err: any) => {
                        if (err) {
                            return reject(err);
                        }
                        if (this.config.yaml) {
                            this.debugger('Saving specs yaml file to folder: %j', swaggerDir);
                            writeFile(`${swaggerDir}/swagger.yaml`, stringify(spec, 1000), (errYaml: any) => {
                                if (errYaml) {
                                    return reject(errYaml);
                                }
                                this.debugger('Generated files saved to folder: %j', swaggerDir);
                                resolve();
                            });
                        } else {
                            this.debugger('Generated files saved to folder: %j', swaggerDir);
                            resolve();
                        }
                    });
                }).catch(reject);
            });
        });
    }

    public getMetaData() {
        return this.metadata;
    }

    public getSwaggerSpec() {
        let spec: Swagger.Spec = {
            basePath: this.config.basePath,
            definitions: this.buildDefinitions(),
            info: {},
            paths: this.buildPaths(),
            swagger: '2.0'
        };

        spec.securityDefinitions = this.config.securityDefinitions
            ? this.config.securityDefinitions
            : {};

        if (this.config.consumes) { spec.consumes = this.config.consumes; }
        if (this.config.produces) { spec.produces = this.config.produces; }
        if (this.config.description) { spec.info.description = this.config.description; }
        if (this.config.license) { spec.info.license = { name: this.config.license }; }
        if (this.config.name) { spec.info.title = this.config.name; }
        if (this.config.version) { spec.info.version = this.config.version; }
        if (this.config.host) { spec.host = this.config.host; }

        if (this.config.spec) {
            spec = require('merge').recursive(spec, this.config.spec);
        }

        this.debugger('Generated specs: %j', spec);
        return spec;
    }

    public async getOpenApiSpec() {
        return await this.convertToOpenApiSpec(this.getSwaggerSpec());
    }

    private async convertToOpenApiSpec(spec: Swagger.Spec) {
        this.debugger('Converting specs to openapi 3.0');
        const converter = require('swagger2openapi');
        const options = {
            patch: true,
            warnOnly: true
        };
        const openapi = await converter.convertObj(spec, options);
        this.debugger('Converted to openapi 3.0: %j', openapi);
        return openapi.openapi;
    }


    private buildDefinitions() {
        const definitions: { [definitionsName: string]: Swagger.Schema } = {};
        Object.keys(this.metadata.referenceTypes).map(typeName => {
            const referenceType : Resolver.ReferenceType = this.metadata.referenceTypes[typeName];
            // const key : string = referenceType.typeName.replace('_', '');

            if (Resolver.isRefObjectType(referenceType)) {
                const required = referenceType.properties.filter((p: Property) => p.required).map((p: Property) => p.name);

                definitions[referenceType.refName] = {
                    description: referenceType.description,
                    properties: this.buildProperties(referenceType.properties),
                    required: required && required.length > 0 ? Array.from(new Set(required)) : undefined,
                    type: 'object',
                };

                if (referenceType.additionalProperties) {
                    definitions[referenceType.refName].additionalProperties = true;
                } else {
                    // Since additionalProperties was not explicitly set in the TypeScript interface for this model
                    //      ...we need to make a decision
                    definitions[referenceType.refName].additionalProperties = true;
                }

                if (referenceType.example) {
                    // @ts-ignore
                    definitions[referenceType.refName].example = referenceType.example;
                }
            } else if (Resolver.isRefEnumType(referenceType)) {

                definitions[referenceType.refName] = {
                    description: referenceType.description,
                    enum: referenceType.members,
                    type: this.decideEnumType(referenceType.members, referenceType.refName),
                };

                if (referenceType.memberNames !== undefined && referenceType.members.length === referenceType.memberNames.length) {
                    // @ts-ignore
                    definitions[referenceType.refName]['x-enum-varnames'] = referenceType.memberNames;
                }
            } else if (Resolver.isRefAliasType(referenceType)) {
                const swaggerType = this.getSwaggerType(referenceType.type);
                const format = referenceType.format;
                const validators = Object.keys(referenceType.validators)
                    .filter(key => {
                        return !key.startsWith('is') && key !== 'minDate' && key !== 'maxDate';
                    })
                    .reduce((acc, key) => {
                        return {
                            ...acc,
                            [key]: referenceType.validators[key].value,
                        };
                    }, {});

                definitions[referenceType.refName] = {
                    ...(swaggerType as Swagger.Schema),
                    default: referenceType.default || swaggerType.default,
                    example: referenceType.example as {[p: string]: Swagger.Example},
                    format: format || swaggerType.format,
                    description: referenceType.description,
                    ...validators,
                };
            } else {
                console.log(referenceType);
            }
        });

        return definitions;
    }

    private buildPaths() {
        const paths: { [pathName: string]: Swagger.Path } = {};

        this.debugger('Generating paths declarations');
        this.metadata.controllers.forEach(controller => {
            this.debugger('Generating paths for controller: %s', controller.name);
            controller.methods.forEach(method => {
                this.debugger('Generating paths for method: %s', method.name);
                const path = posix.join('/', (controller.path ? controller.path : ''), method.path);
                paths[path] = paths[path] || {};
                method.consumes = union(controller.consumes, method.consumes);
                method.produces = union(controller.produces, method.produces);
                method.tags = union(controller.tags, method.tags);
                method.security = method.security || controller.security;
                method.responses = union(controller.responses, method.responses);
                const pathObject: any = paths[path];
                pathObject[method.method] = this.buildPathMethod(controller.name, method);
                this.debugger('Generated path for method %s: %j', method.name, pathObject[method.method]);
            });
        });

        return paths;
    }

    private buildPathMethod(controllerName: string, method: Method) {
        const pathMethod: any = this.buildOperation(controllerName, method);
        pathMethod.description = method.description;
        if (method.summary) {
            pathMethod.summary = method.summary;
        }

        if (method.deprecated) { pathMethod.deprecated = method.deprecated; }
        if (method.tags.length) { pathMethod.tags = method.tags; }
        if (method.security) {
            pathMethod.security = method.security.map(s => ({
                [s.name]: s.scopes || []
            }));
        }
        this.handleMethodConsumes(method, pathMethod);

        pathMethod.parameters = method.parameters
            .filter(p => (p.in !== 'param'))
            .map(p => this.buildParameter(p));

        method.parameters
            .filter(p => (p.in === 'param'))
            .forEach(p => {
                pathMethod.parameters.push(this.buildParameter({
                    description: p.description,
                    in: 'query',
                    name: p.name,
                    parameterName: p.parameterName,
                    required: false,
                    type: p.type
                }));
                pathMethod.parameters.push(this.buildParameter({
                    description: p.description,
                    in: 'formData',
                    name: p.name,
                    parameterName: p.parameterName,
                    required: false,
                    type: p.type
                }));
            });
        if (pathMethod.parameters.filter((p: Swagger.BaseParameter) => p.in === 'body').length > 1) {
            throw new Error('Only one body parameter allowed per controller method.');
        }
        return pathMethod;
    }

    private handleMethodConsumes(method: Method, pathMethod: any) {
        if (method.consumes.length) { pathMethod.consumes = method.consumes; }

        if ((!pathMethod.consumes || !pathMethod.consumes.length)) {
            if (method.parameters.some(p => (p.in === 'formData' && p.type.typeName === 'file'))) {
                pathMethod.consumes = pathMethod.consumes || [];
                pathMethod.consumes.push('multipart/form-data');
            } else if (this.hasFormParams(method)) {
                pathMethod.consumes = pathMethod.consumes || [];
                pathMethod.consumes.push('application/x-www-form-urlencoded');
            } else if (this.supportsBodyParameters(method.method)) {
                pathMethod.consumes = pathMethod.consumes || [];
                pathMethod.consumes.push('application/json');
            }
        }
    }

    private hasFormParams(method: Method) {
        return method.parameters.find(p => (p.in === 'formData'));
    }

    private supportsBodyParameters(method: string) {
        return ['post', 'put', 'patch'].some(m => m === method);
    }

    private buildParameter(parameter: Parameter): Swagger.Parameter {
        const swaggerParameter: any = {
            description: parameter.description,
            in: parameter.in,
            name: parameter.name,
            required: parameter.required
        };

        const parameterType = this.getSwaggerType(parameter.type);
        if (parameterType.$ref || parameter.in === 'body') {
            swaggerParameter.schema = parameterType;
        } else {
            swaggerParameter.type = parameterType.type;

            if (parameterType.items) {
                swaggerParameter.items = parameterType.items;

                if (parameter.collectionFormat || this.config.collectionFormat) {
                    swaggerParameter.collectionFormat = parameter.collectionFormat || this.config.collectionFormat;
                }
            }
        }

        if (parameterType.format) { swaggerParameter.format = parameterType.format; }

        if (parameter.default !== undefined) { swaggerParameter.default = parameter.default; }

        if (parameterType.enum) { swaggerParameter.enum = parameterType.enum; }

        return swaggerParameter;
    }

    private buildProperties(properties: Array<Property>) {
        const swaggerProperties: { [propertyName: string]: Swagger.Schema } = {};

        properties.forEach(property => {
            const swaggerType = this.getSwaggerType(property.type);
            if (!swaggerType.$ref) {
                swaggerType.description = property.description;
            }
            swaggerProperties[property.name] = swaggerType;
        });

        return swaggerProperties;
    }

    private decideEnumType(anEnum: Array<string | number>, nameOfEnum: string): 'string' | 'number' {
        const typesUsedInEnum = this.determineTypesUsedInEnum(anEnum);

        const badEnumErrorMessage = () => {
            const valuesDelimited = Array.from(typesUsedInEnum).join(',');
            return `Enums can only have string or number values, but enum ${nameOfEnum} had ${valuesDelimited}`;
        };

        let enumTypeForSwagger: 'string' | 'number' = 'string';
        if (typesUsedInEnum.has('string') && typesUsedInEnum.size === 1) {
            enumTypeForSwagger = 'string';
        } else if (typesUsedInEnum.has('number') && typesUsedInEnum.size === 1) {
            enumTypeForSwagger = 'number';
        } else if(typesUsedInEnum.size === 2 && typesUsedInEnum.has('number') && typesUsedInEnum.has('string')) {
            enumTypeForSwagger = 'string';
        } else {
            throw new Error(badEnumErrorMessage());
        }

        return enumTypeForSwagger;
    }

    private buildOperation(controllerName: string, method: Method) {
        const operation: any = {
            operationId: this.getOperationId(controllerName, method.name),
            produces: [],
            responses: {}
        };
        const methodReturnTypes = new Set<string>();

        method.responses.forEach((res: ResponseType) => {
            operation.responses[res.status] = {
                description: res.description
            };

            if (res.schema) {
                const swaggerType = this.getSwaggerType(res.schema);
                if (swaggerType.type !== 'void') {
                    operation.responses[res.status]['schema'] = swaggerType;
                }
                methodReturnTypes.add(this.getMimeType(swaggerType));
            }
            if (res.examples) {
                operation.responses[res.status]['examples'] = { 'application/json': res.examples };
            }
        });
        this.handleMethodProduces(method, operation, methodReturnTypes);
        return operation;
    }

    private getMimeType(swaggerType: Swagger.Schema) {
        if (swaggerType.$ref || swaggerType.type === 'array' || swaggerType.type === 'object') {
            return 'application/json';
        } else if (swaggerType.type === 'string' && swaggerType.format === 'binary') {
            return 'application/octet-stream';
        } else {
            return 'text/html';
        }
    }

    private handleMethodProduces(method: Method, operation: any, methodReturnTypes: Set<string>) {
        if (method.produces.length) {
            operation.produces = method.produces;
        } else if (methodReturnTypes && methodReturnTypes.size > 0) {
            operation.produces = Array.from(methodReturnTypes);
        }
    }

    private getOperationId(controllerName: string, methodName: string) {
        const controllerNameWithoutSuffix = controllerName.replace(new RegExp('Controller$'), '');
        return `${controllerNameWithoutSuffix}${methodName.charAt(0).toUpperCase() + methodName.substr(1)}`;
    }

    private getSwaggerType(type: Resolver.BaseType) : Swagger.BaseSchema | Swagger.Schema {
        if (Resolver.isVoidType(type)) {
            return {} as Swagger.BaseSchema;
        } else if (Resolver.isReferenceType(type)) {
            return this.getSwaggerTypeForReferenceType(type);
        } else if (
            type.typeName === 'any' ||
            type.typeName === 'binary' ||
            type.typeName === 'boolean' ||
            type.typeName === 'buffer' ||
            type.typeName === 'byte' ||
            type.typeName === 'date' ||
            type.typeName === 'datetime' ||
            type.typeName === 'double' ||
            type.typeName === 'float' ||
            type.typeName === 'file' ||
            type.typeName === 'integer' ||
            type.typeName === 'long' ||
            type.typeName === 'object' ||
            type.typeName === 'string'
        ) {
            return this.getSwaggerTypeForPrimitiveType(type.typeName);
        } else if (Resolver.isArrayType(type)) {
            return this.getSwaggerTypeForArrayType(type);
        } else if (Resolver.isEnumType(type)) {
            return this.getSwaggerTypeForEnumType(type);
        } else if (Resolver.isUnionType(type)) {
            return this.getSwaggerTypeForUnionType(type);
        } else if (Resolver.isIntersectionType(type)) {
            return this.getSwaggerTypeForIntersectionType(type);
        } else if (Resolver.isNestedObjectLiteralType(type)) {
            return this.getSwaggerTypeForObjectLiteral(type);
        } else {
            console.log(type);
        }

        return {} as Swagger.BaseSchema;
    }

    protected isNull(type: Resolver.Type) {
        return Resolver.isEnumType(type) && type.members.length === 1 && type.members[0] === null;
    }

    protected getSwaggerTypeForUnionType(type: Resolver.UnionType) {
        if (type.members.every((subType: Resolver.Type) => subType.typeName === 'enum')) {
            const mergedEnum: Resolver.EnumType = { typeName: 'enum', members: [] };
            type.members.forEach((t: Resolver.Type) => {
                mergedEnum.members = [...mergedEnum.members, ...(t as Resolver.EnumType).members];
            });
            return this.getSwaggerTypeForEnumType(mergedEnum);
        } else if (type.members.length === 2 && type.members.find((typeInUnion: Resolver.Type) => typeInUnion.typeName === 'enum' && typeInUnion.members.includes(null))) {
            // Backwards compatible representation of dataType or null, $ref does not allow any sibling attributes, so we have to bail out
            const nullEnumIndex = type.members.findIndex((a: Resolver.Type) => Resolver.isEnumType(a) && a.members.includes(null));
            const typeIndex = nullEnumIndex === 1 ? 0 : 1;
            const swaggerType = this.getSwaggerType(type.members[typeIndex]);
            const isRef = !!swaggerType.$ref;

            if (isRef) {
                return { type: 'object' };
            } else {
                // @ts-ignore
                swaggerType['x-nullable'] = true;
                return swaggerType;
            }
        }

        if(type.members.length === 2) {
            const index = type.members.findIndex((member: Resolver.Type) => Resolver.isArrayType(member));
            if(index !== -1) {
                const otherIndex = index === 0 ? 1 : 0;

                if((type.members[index] as Resolver.ArrayType).elementType.typeName === type.members[otherIndex].typeName) {
                    return this.getSwaggerType(type.members[otherIndex]);
                }
            }
        }

        return { type: 'object' };
    }

    private getSwaggerTypeForPrimitiveType(type: Resolver.PrimitiveTypeLiteral) {
        const map: Record<Resolver.PrimitiveTypeLiteral, Swagger.Schema> = {
            any: {
                // While the any type is discouraged, it does explicitly allows anything, so it should always allow additionalProperties
                additionalProperties: true,
            },
            binary: { type: 'string', format: 'binary' },
            boolean: { type: 'boolean' },
            buffer: { type: 'string', format: 'byte' },
            byte: { type: 'string', format: 'byte' },
            date: { type: 'string', format: 'date' },
            datetime: { type: 'string', format: 'date-time' },
            double: { type: 'number', format: 'double' },
            file: { type: 'file' },
            float: { type: 'number', format: 'float' },
            integer: { type: 'integer', format: 'int32' },
            long: { type: 'integer', format: 'int64' },
            object: {
                additionalProperties: true,
                type: 'object',
            },
            string: { type: 'string' },
        };

        return map[type];
    }

    private getSwaggerTypeForArrayType(arrayType: Resolver.ArrayType): Swagger.Schema {
        return { type: 'array', items: this.getSwaggerType(arrayType.elementType) };
    }

    protected getSwaggerTypeForIntersectionType(type: Resolver.IntersectionType) : Swagger.Schema {
        return { allOf: type.members.map((x: Resolver.Type) => this.getSwaggerType(x)) };
    }

    protected getSwaggerTypeForEnumType(enumType: Resolver.EnumType) : Swagger.Schema2 | Swagger.Schema3 {
        const types = this.determineTypesUsedInEnum(enumType.members);

        if (types.size === 1) {
            const type = types.values().next().value;
            const nullable = !!enumType.members.includes(null);
            return { type: type, enum: enumType.members.map((member: string | number | boolean | null) => (member === null ? null : String(member))), nullable: nullable };
        } else {
            const valuesDelimited = Array.from(types).join(',');
            throw new Error(`Enums can only have string or number values, but enum had ${valuesDelimited}`);
        }
    }

    public getSwaggerTypeForObjectLiteral(objectLiteral: Resolver.NestedObjectLiteralType) : Swagger.Schema {
        const properties = this.buildProperties(objectLiteral.properties);

        const additionalProperties = objectLiteral.additionalProperties && this.getSwaggerType(objectLiteral.additionalProperties);

        const required = objectLiteral.properties.filter((prop: Property) => prop.required).map((prop: Property) => prop.name);

        // An empty list required: [] is not valid.
        // If all properties are optional, do not specify the required keyword.
        return {
            properties: properties,
            ...(additionalProperties && { additionalProperties: additionalProperties }),
            ...(required && required.length && { required: required }),
            type: 'object',
        };
    }

    private getSwaggerTypeForReferenceType(referenceType: Resolver.ReferenceType): Swagger.Schema {
        return { $ref: `#/definitions/${referenceType.refName}` };
    }

    protected determineTypesUsedInEnum(anEnum: Array<string | number | boolean | null>) {
        return anEnum.reduce((theSet, curr) => {
            const typeUsed = curr === null ? 'number' : typeof curr;
            theSet.add(typeUsed);
            return theSet;
        }, new Set<'string' | 'number' | 'bigint' | 'boolean' | 'symbol' | 'undefined' | 'object' | 'function'>());
    }
}
