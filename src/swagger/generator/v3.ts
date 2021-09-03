import {Resolver} from "../../metadata/resolver/type";
import {hasOwnProperty} from "../../metadata/resolver/utils";
import {Metadata, Parameter, Property, Response} from "../../metadata/type";
import {Swagger} from "../type";
import {SwaggerV2} from "../type/v2";
import {SwaggerV3} from "../type/v3";
import {SpecGenerator} from "./index";
import {removeFinalCharacter, removeRepeatingCharacter} from "./utils";

export class Version3SpecGenerator extends SpecGenerator<SwaggerV3.Spec, SwaggerV3.Schema> {
    public build(): void {
        let spec: SwaggerV3.Spec = {
            components: this.buildComponents(),
            info: this.buildInfo(),
            openapi: '3.0.0',
            paths: this.buildPaths(),
            servers: this.buildServers(),
            tags: [],
        };

        if (this.config.spec) {
            spec = require('merge').recursive(spec, this.config.spec);
        }

        this.spec = spec;
    }

    private buildComponents() {
        const components = {
            examples: {},
            headers: {},
            parameters: {},
            requestBodies: {},
            responses: {},
            schemas: this.buildSchema(),
            securitySchemes: {},
        };

        if (this.config.securityDefinitions) {
            components.securitySchemes = Version3SpecGenerator.translateSecurityDefinitions(this.config.securityDefinitions);
        }

        return components;
    }

    private static translateSecurityDefinitions(securityDefinitions: Record<string, SwaggerV2.Security>) : Record<string, SwaggerV3.Security> {
        const security : Record<string, SwaggerV3.Security> = {};

        // tslint:disable-next-line:forin
        for(const name in securityDefinitions) {
            const securityDefinition = securityDefinitions[name];
            switch (securityDefinition.type) {
                case "basic":
                    security[name] = {
                        schema: 'basic',
                        type: 'http'
                    };
                    break;
                case "oauth2":
                    let definition : SwaggerV3.OAuth2Security = {
                        type: "oauth2",
                        description: securityDefinition.description,
                        flows: {}
                    };

                    if(
                        hasOwnProperty(security, name) &&
                        security[name].type === 'oauth2'
                    ) {
                        definition = {...definition, ...security[name] as SwaggerV3.OAuth2Security};
                    }

                    if(hasOwnProperty(securityDefinition, 'flow')) {
                        switch (securityDefinition.flow) {
                            case "accessCode":
                                definition.flows.authorizationCode = {
                                    tokenUrl: securityDefinition.tokenUrl,
                                    authorizationUrl: securityDefinition.authorizationUrl,
                                    scopes: securityDefinition.scopes || {}
                                };
                                break;
                            case "application":
                                definition.flows.clientCredentials = {
                                    tokenUrl: securityDefinition.tokenUrl,
                                    scopes: securityDefinition.scopes || {}
                                };
                                break;
                            case "implicit":
                                definition.flows.implicit = {
                                    authorizationUrl: securityDefinition.authorizationUrl,
                                    scopes: securityDefinition.scopes || {}
                                };
                                break;
                            case "password":
                                definition.flows.password = {
                                    tokenUrl: securityDefinition.tokenUrl,
                                    scopes: securityDefinition.scopes || {}
                                };
                                break;
                        }
                    }

                    security[name] = definition;
                    break;
                case "apiKey":
                    security[name] = securityDefinitions[name] as Swagger.ApiKeySecurity;

            }
        }

        return security;
    }

    private buildPaths() {
        const paths: { [pathName: string]: Swagger.Path<SwaggerV3.Operation, SwaggerV3.Parameter> } = {};

        this.metadata.controllers.forEach(controller => {
            // construct documentation using all methods except @Hidden
            controller.methods
                .filter(method => !method.isHidden)
                .forEach(method => {
                    const path = removeFinalCharacter(removeRepeatingCharacter(`/${controller.path}/${method.path}`), '/');
                    paths[path] = paths[path] || {};
                    this.buildMethod(controller.name, method, paths[path]);
                });
        });

        return paths;
    }

    private buildMethod(controllerName: string, method: Metadata.Method, pathObject: any) {
        const pathMethod: SwaggerV3.Operation = (pathObject[method.method] = this.buildOperation(controllerName, method));
        pathMethod.description = method.description;
        pathMethod.summary = method.summary;
        pathMethod.tags = method.tags;

        // Use operationId tag otherwise fallback to generated. Warning: This doesn't check uniqueness.
        pathMethod.operationId = method.operationId || pathMethod.operationId;

        if (method.deprecated) {
            pathMethod.deprecated = method.deprecated;
        }

        if (method.security) {
            pathMethod.security = method.security as any[];
        }

        const bodyParams = method.parameters.filter(p => p.in === 'body');
        const formParams = method.parameters.filter(p => p.in === 'formData');

        pathMethod.parameters = method.parameters
            .filter(p => {
                return ['body', 'formData', 'request', 'body-prop', 'res'].indexOf(p.in) === -1;
            })
            .map(p => this.buildParameter(p));

        if (bodyParams.length > 1) {
            throw new Error('Only one body parameter allowed per controller method.');
        }

        if (bodyParams.length > 0 && formParams.length > 0) {
            throw new Error('Either body parameter or form parameters allowed per controller method - not both.');
        }

        if (bodyParams.length > 0) {
            pathMethod.requestBody = this.buildRequestBody(bodyParams[0]);
        } else if (formParams.length > 0) {
            pathMethod.requestBody = this.buildRequestBodyWithFormData(formParams);
        }

        method.extensions.forEach(ext => (pathMethod[ext.key] = ext.value));
    }

    private buildRequestBodyWithFormData(parameters: Parameter[]): SwaggerV3.RequestBody {
        const required: string[] = [];
        const properties: { [propertyName: string]: SwaggerV3.Schema } = {};
        for (const parameter of parameters) {
            const mediaType = this.buildMediaType(parameter);
            properties[parameter.name] = mediaType.schema!;
            if (parameter.required) {
                required.push(parameter.name);
            }
        }
        return {
            required: required.length > 0,
            content: {
                'multipart/form-data': {
                    schema: {
                        type: 'object',
                        properties: properties,
                        // An empty list required: [] is not valid.
                        // If all properties are optional, do not specify the required keyword.
                        ...(required && required.length && {required: required}),
                    },
                },
            },
        };
    }

    private buildRequestBody(parameter: Parameter): SwaggerV3.RequestBody {
        const mediaType = this.buildMediaType(parameter);

        return {
            description: parameter.description,
            required: parameter.required,
            content: {
                'application/json': mediaType,
            },
        };
    }

    private buildMediaType(parameter: Parameter): SwaggerV3.MediaType {
        const mediaType: SwaggerV3.MediaType = {
            schema: this.getSwaggerType(parameter.type),
        };

        this.buildFromParameterExamples(mediaType, parameter);

        return mediaType;
    }

    protected buildOperation(controllerName: string, method: Metadata.Method): SwaggerV3.Operation {
        const swaggerResponses: { [name: string]: SwaggerV3.Response } = {};

        method.responses.forEach((res: Response) => {
            const name : string = res.status ?? 'default';
            // no string key
            swaggerResponses[name] = {
                description: res.description,
            };

            if (res.schema && !Resolver.isVoidType(res.schema)) {
                const contentKey : string = 'application/json';
                swaggerResponses[name].content = {
                    [contentKey]: {
                        schema: this.getSwaggerType(res.schema) as SwaggerV3.Schema,
                    } as SwaggerV3.Schema,
                };

                if (res.examples) {
                    let exampleCounter = 1;
                    /* eslint-disable @typescript-eslint/dot-notation */
                    swaggerResponses[name].content[contentKey]['examples'] = {};
                    for(let i=0; i<res.examples.length; i++) {
                        swaggerResponses[name].content[contentKey]['examples'][`Example ${exampleCounter++}`] = {
                            value: res.examples[i]
                        };
                    }
                }
            }

            if (res.headers) {
                const headers: { [name: string]: SwaggerV3.Header } = {};
                if (res.headers.typeName === 'refObject') {
                    headers[res.headers.refName] = {
                        schema: this.getSwaggerTypeForReferenceType(res.headers) as SwaggerV3.Schema,
                        description: res.headers.description,
                    };
                } else if (res.headers.typeName === 'nestedObjectLiteral') {
                    res.headers.properties.forEach((each: Property) => {
                        headers[each.name] = {
                            schema: this.getSwaggerType(each.type) as SwaggerV3.Schema,
                            description: each.description,
                            required: each.required,
                        };
                    });
                }

                swaggerResponses[res.name].headers = headers;
            }
        });

        return {
            operationId: this.getOperationId(method.name),
            responses: swaggerResponses,
        };
    }

    private buildParameter(source: Parameter): SwaggerV3.Parameter {
        const parameter : SwaggerV3.Parameter = {
            description: source.description,
            in: source.in as Swagger.ParameterInType,
            name: source.name,
            required: source.required,
            schema: {
                default: source.default,
                format: undefined,
            },
        };

        if (source.deprecated) {
            parameter.deprecated = true;
        }

        const parameterType = this.getSwaggerType(source.type);
        if (parameterType.format) {
            parameter.schema.format = parameterType.format;
        }

        if (
            hasOwnProperty(parameterType, '$ref') &&
            parameterType.$ref
        ) {
            parameter.schema = parameterType as SwaggerV3.Schema;
            return parameter;
        }

        if (source.type.typeName === 'any') {
            parameter.schema.type = 'string';
        } else {
            if (parameterType.type) {
                parameter.schema.type = parameterType.type as Swagger.DataType;
            }
            parameter.schema.items = parameterType.items;
            parameter.schema.enum = parameterType.enum;
        }

        this.buildFromParameterExamples(parameter, source);

        return parameter;
    }

    private buildFromParameterExamples(
        parameter: SwaggerV3.Parameter | SwaggerV3.MediaType,
        sourceParameter: Parameter
    ) {
        if (
            (Array.isArray(sourceParameter.example) && sourceParameter.example.length === 1) ||
            typeof sourceParameter.example === 'undefined'
        ) {
            parameter.example = Array.isArray(sourceParameter.example) && sourceParameter.example.length === 1 ? sourceParameter.example[0] : undefined;
        } else {
            parameter.examples = {};
            sourceParameter.example.forEach((example, index) =>
                Object.assign(parameter.examples, {
                    [`Example ${index + 1}`]: { value: example } as Swagger.Example,
                }),
            );
        }
        return parameter;
    }

    private buildServers() : SwaggerV3.Server[] {
        const url = new URL(this.config.host);
        let host : string = (url.host + url.pathname).replace(/([^:]\/)\/+/g, "$1");
        host = host.substr(-1, 1) === '/' ? host.substr(0, host.length -1) : host;

        return [
            {
                url: host,
            }
        ];
    }

    private buildSchema() {
        const schema: { [name: string]: SwaggerV3.Schema } = {};
        Object.keys(this.metadata.referenceTypes).map(typeName => {
            const referenceType = this.metadata.referenceTypes[typeName];

            if (referenceType.typeName === 'refObject') {
                const required = referenceType.properties.filter(p => p.required).map(p => p.name);
                schema[referenceType.refName] = {
                    description: referenceType.description,
                    properties: this.buildProperties(referenceType.properties),
                    required: required && required.length > 0 ? Array.from(new Set(required)) : undefined,
                    type: 'object',
                };

                if (referenceType.additionalProperties) {
                    schema[referenceType.refName].additionalProperties = this.getSwaggerType(referenceType.additionalProperties);
                }

                if (referenceType.example) {
                    schema[referenceType.refName].example = referenceType.example;
                }
            } else if (referenceType.typeName === 'refEnum') {
                const enumTypes = this.determineTypesUsedInEnum(referenceType.members);

                if (enumTypes.size === 1) {
                    schema[referenceType.refName] = {
                        description: referenceType.description,
                        enum: referenceType.members,
                        type: enumTypes.has('string') ? 'string' : 'number',
                    };
                    if (referenceType.memberNames !== undefined && referenceType.members.length === referenceType.memberNames.length) {
                        schema[referenceType.refName]['x-enum-varnames'] = referenceType.memberNames;
                    }
                } else {
                    schema[referenceType.refName] = {
                        description: referenceType.description,
                        anyOf: [
                            {
                                type: 'number',
                                enum: referenceType.members.filter(e => typeof e === 'number'),
                            },
                            {
                                type: 'string',
                                enum: referenceType.members.filter(e => typeof e === 'string'),
                            },
                        ],
                    };
                }
            } else if (referenceType.typeName === 'refAlias') {
                const swaggerType = this.getSwaggerType(referenceType.type);
                const format = referenceType.format as Swagger.DataFormat;
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

                schema[referenceType.refName] = {
                    ...(swaggerType as SwaggerV3.Schema),
                    default: referenceType.default || swaggerType.default,
                    example: referenceType.example,
                    format: format || swaggerType.format,
                    description: referenceType.description,
                    ...validators,
                };
            }

            if (referenceType.deprecated) {
                schema[referenceType.refName].deprecated = true;
            }
        });

        return schema;
    }

    protected getSwaggerTypeForIntersectionType(type: Resolver.IntersectionType) : SwaggerV3.Schema {
        return { allOf: type.members.map((x: Resolver.Type) => this.getSwaggerType(x)) };
    }

    protected buildProperties<T>(properties: Property[]): Record<string, SwaggerV3.Schema> {
        const result: { [propertyName: string]: SwaggerV3.Schema } = {};

        properties.forEach(property => {
            const swaggerType = this.getSwaggerType(property.type) as SwaggerV3.Schema;
            const format = property.format as Swagger.DataFormat;
            swaggerType.description = property.description;
            swaggerType.example = property.example;
            swaggerType.format = format || swaggerType.format;

            if (!swaggerType.$ref) {
                swaggerType.default = property.default;
            }

            if (property.deprecated) {
                swaggerType.deprecated = true;
            }

            result[property.name] = swaggerType;
        });

        return result;
    }

    protected getSwaggerTypeForEnumType(enumType: Resolver.EnumType): SwaggerV3.Schema {
        const types = this.determineTypesUsedInEnum(enumType.members);

        if (types.size === 1) {
            const type = types.values().next().value;
            const nullable = !!enumType.members.includes(null);
            return { type: type, enum: enumType.members.map(member => (member === null ? null : String(member))), nullable: nullable };
        } else {
            const valuesDelimited = Array.from(types).join(',');
            throw new Error(`Enums can only have string or number values, but enum had ${valuesDelimited}`);
        }
    }

    protected getSwaggerTypeForReferenceType(referenceType: Resolver.ReferenceType): SwaggerV3.Schema {
        return {
            $ref: `#/components/schemas/${referenceType.refName}`
        };
    }
}
