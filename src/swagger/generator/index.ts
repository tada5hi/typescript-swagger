import {Debugger} from "debug";
import {promises, writeFile} from 'fs';
import * as path from "path";
import {stringify} from 'yamljs';
import {SwaggerConfig} from '../../config';
import {useDebugger} from "../../debug";
import {Resolver} from "../../metadata/resolver/type";
import {hasOwnProperty} from "../../metadata/resolver/utils";
import {Metadata, Property} from "../../metadata/type";

import {Swagger} from '../type';
import {SwaggerV2} from "../type/v2";
import {SwaggerV3} from "../type/v3";
import {SwaggerOutputFormatData, SwaggerOutputFormatType} from "../utils";
import BaseSchema = Swagger.BaseSchema;

export abstract class SpecGenerator<
    Spec extends SwaggerV2.Spec | SwaggerV3.Spec,
    Schema extends SwaggerV3.Schema | SwaggerV2.Schema
    > {
    private debugger : Debugger = useDebugger();

    protected spec: Spec;

    constructor(protected readonly metadata: Metadata.Output, protected readonly config: SwaggerConfig) {

    }

    public async save() : Promise<Record<SwaggerOutputFormatType, SwaggerOutputFormatData>> {
        const swaggerDir : string = this.config.outputDirectory;
        this.debugger('Saving specs to folder: %j', swaggerDir);

        await promises.mkdir(swaggerDir, {recursive: true});

        const data : Record<SwaggerOutputFormatType, SwaggerOutputFormatData & {content: string} | undefined> = {
            json: {
                filePath: path.join(swaggerDir, 'swagger.json'),
                fileName: 'swagger.json',
                content: JSON.stringify(this.spec, null, '\t')
            },
            yaml: undefined
        };

        if(this.config.yaml) {
            data.yaml = {
                filePath: path.join(swaggerDir, 'swagger.yaml'),
                fileName: 'swagger.yaml',
                content: stringify(this.spec, 1000)
            };
        }

        const filePromises : Array<Promise<void>> = [];

        for(const key in data) {
            if(typeof data[key as SwaggerOutputFormatType] === 'undefined') {
                continue;
            }

            const output = data[key as SwaggerOutputFormatType];

            filePromises.push(new Promise(((resolve, reject) => {
                return writeFile(output.filePath, output.content, (err: any) => {
                    if (err) {
                        return reject(err);
                    }

                    return resolve();
                });
            }))) ;
        }

        await Promise.all(filePromises);

        return data;
    }

    public getMetaData() {
        return this.metadata;
    }

    public getSwaggerSpec() : Spec {
        if(typeof this.spec === 'undefined') {
            this.build();
        }

        return this.spec;
    }

    public abstract build() : void;

    protected buildInfo() {
        const info: Swagger.Info = {
            title: this.config.name || '',
            version: this.config.version || '1.0.0'
        };

        if (this.config.description) {
            info.description = this.config.description;
        }

        if (this.config.license) {
            info.license = { name: this.config.license };
        }

        return info;
    }

    /*
    public async getOpenApiSpec() {
        return await this.convertToOpenApiSpec();
    }


    private async convertToOpenApiSpec() {
        const spec = this.getSwaggerSpec();

        const converter = require('swagger2openapi');
        const openapi = await converter.convertObj(spec, {
            patch: true,
            warnOnly: true
        });

        return openapi.openapi;
    }
    */

    protected getSwaggerType(type: Resolver.BaseType) : Schema | BaseSchema<Schema> {
        if (Resolver.isVoidType(type)) {
            return {} as Schema;
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
        }

        return {} as Schema;
    }

    protected abstract getSwaggerTypeForIntersectionType(type: Resolver.IntersectionType) : Schema;

    protected abstract getSwaggerTypeForEnumType(enumType: Resolver.EnumType) : Schema;

    protected getSwaggerTypeForUnionType(type: Resolver.UnionType) : Schema | BaseSchema<Schema> {
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
            const isRef = hasOwnProperty(swaggerType, '$ref') && !!swaggerType.$ref;

            if (isRef) {
                return { type: 'object' } as Schema;
            } else {
                // @ts-ignore
                swaggerType['x-nullable'] = true;
                return swaggerType;
            }
        }

        if(type.members.length === 2) {
            let index = type.members.findIndex((member: Resolver.Type) => Resolver.isArrayType(member));
            if(index !== -1) {
                const otherIndex = index === 0 ? 1 : 0;

                if((type.members[index] as Resolver.ArrayType).elementType.typeName === type.members[otherIndex].typeName) {
                    return this.getSwaggerType(type.members[otherIndex]);
                }
            }

            index = type.members.findIndex((member: Resolver.Type) => Resolver.isAnyType(member));
            if(index !== -1) {
                const otherIndex = index === 0 ? 1 : 0;

                if(Resolver.isAnyType(type.members[index])) {
                    return this.getSwaggerType(type.members[otherIndex]);
                }
            }
        }

        return { type: 'object' } as Schema;
    }

    private getSwaggerTypeForPrimitiveType(type: Resolver.PrimitiveTypeLiteral) : BaseSchema<Schema> {
        const PrimitiveSwaggerTypeMap: Record<Resolver.PrimitiveTypeLiteral, BaseSchema<Schema>> = {
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
            file: { type: 'string', format: 'binary' },
            float: { type: 'number', format: 'float' },
            integer: { type: 'integer', format: 'int32' },
            long: { type: 'integer', format: 'int64' },
            object: {type: 'object' },
            string: { type: 'string' },
        };

        return PrimitiveSwaggerTypeMap[type];
    }

    private getSwaggerTypeForArrayType(arrayType: Resolver.ArrayType) : Swagger.BaseSchema<Schema> {
        return { type: 'array', items: this.getSwaggerType(arrayType.elementType)};
    }



    public getSwaggerTypeForObjectLiteral(objectLiteral: Resolver.NestedObjectLiteralType) : BaseSchema<Schema> {
        const properties = this.buildProperties(objectLiteral.properties);

        const additionalProperties = objectLiteral.additionalProperties && this.getSwaggerType(objectLiteral.additionalProperties);

        const required = objectLiteral.properties.filter((prop: Property) => prop.required).map((prop: Property) => prop.name);

        // An empty list required: [] is not valid.
        // If all properties are optional, do not specify the required keyword.
        return {
            properties: properties,
            ...(additionalProperties && {additionalProperties: additionalProperties}),
            ...(required && required.length && {required: required}),
            type: 'object',
        } as BaseSchema<Schema>;
    }

    protected abstract getSwaggerTypeForReferenceType(referenceType: Resolver.ReferenceType): Schema;

    protected abstract buildProperties(properties: Property[]) : Record<string, Schema>;

    protected determineTypesUsedInEnum(anEnum: Array<string | number | boolean | null>) {
        return anEnum.reduce((theSet, curr) => {
            const typeUsed = curr === null ? 'number' : typeof curr;
            theSet.add(typeUsed);
            return theSet;
        }, new Set<'string' | 'number' | 'bigint' | 'boolean' | 'symbol' | 'undefined' | 'object' | 'function'>());
    }

    protected getOperationId(methodName: string) {
        return methodName.charAt(0).toUpperCase() + methodName.substr(1);
    }
}
