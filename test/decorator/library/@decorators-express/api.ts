'use strict';

import {
    Body,
    Controller,
    Delete, Get, Params,
    Post, Put, Query
} from '@decorators/express';

import * as swagger from '../../../../src/decorator';
import { TestInterface } from '../../../data/TestInterface'; // to test compilerOptions.paths

interface MyTypeWithUnion {
    property: 'value1' | 'value2';
}

@Controller('unionTypes')
export class TestUnionType {
    @Post("")
    public post(body: MyTypeWithUnion): string {
        return '42';
    }
}

interface Address {
    street: string;
}

interface Person {
    name: string;
    address?: Address;
}

enum TestEnum {
    Option1 = 'option1',
    Option2 = 'option2'
}

enum TestNumericEnum {
    Option1,
    Option2,
}

enum TestMixedEnum {
    Option1,
    Option2 = 'String param',
}

@Controller('mypath')
@swagger.SwaggerTags('My Services')
export class MyService {
    @swagger.ResponseDescription<string>('default', 'Error')
    @swagger.ResponseDescription<string>(400, 'The request format was incorrect.')
    @swagger.ResponseDescription<string>(500, 'There was an unexpected error.')
    @Get("")
    public test(): string {
        return 'OK';
    }

    /**
     * This is the method description
     * @param test This is the test param description
     * @param test2
     * @param test3
     * @param test4
     * @param test5
     * @param test6
     */
    @Get('secondpath')
    @swagger.ResponseExample<Person>({
        name: 'Joe'
    })
    @swagger.ResponseDescription<Person>(200, 'The success test.')
    public test2(
        @Query('testRequired') test: string,
        @Query('testDefault') test2: string = 'value',
        @Query('testOptional') test3?: string,
        @Query('testEnum') test4?: TestEnum,
        @Query('testNumericEnum') test5?: TestNumericEnum,
        @Query('testMixedEnum') test6?: TestMixedEnum
    ): Person {
        return { name: 'OK' };
    }

    @Post("")
    @swagger.ResponseExample<Person[]>([{
        name: 'Joe'
    }])
    public testPostString(body: string): Person[] {
        return [];
    }

    @Post('obj')
    public testPostObject(data: object) {
        return data;
    }

    @Get('multi-query')
    public testMultiQuery(
        @Query('id') ids: string[],
        @Query('name'/*, { collectionFormat: 'multi', allowEmptyValue: true }*/) names?: string | string[]
    ) {
        return { ids: ids, names: names };
    }

    @Get('default-query')
    public testDefaultQuery(
        @Query('num') num: number = 5,
        @Query('str') str: string = 'default value',
        @Query('bool1') bool1: boolean = true,
        @Query('bool2') bool2: boolean = false,
        @Query('arr') arr: string[] = ['a', 'b', 'c']
    ) {
        return;
    }

    @Post('test-compiler-options')
    public async testCompilerOptions(payload: TestInterface): Promise<TestInterface> {
        return { a: 'string', b: 123 };
    }

    @Post('test-form-param')
    public testFormParam(@Body('id') id: string): string {
        return id;
    }
}

class BaseService {
    @Delete(':id')
    public testDelete(@Params('id') id: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            resolve();
        });
    }
}

@Controller('promise')
export class PromiseService extends BaseService {
    /**
     * Esta eh a da classe
     * @param test Esta eh a description do param teste
     */
    @swagger.ResponseDescription<string>(401, 'Unauthorized')
    @Get("")
    public test(@Query('testParam') test?: string): Promise<Person> {
        return new Promise<Person>((resolve, reject) => {
            resolve({ name: 'OK' });
        });
    }

    @swagger.ResponseDescription<Person>(200, 'All Good')
    @swagger.ResponseDescription<string>(401, 'Unauthorized')
    @swagger.ResponseExample<Person>({ name: 'Test Person' })
    @Get(':id')
    public testGetSingle(@Params('id') id: string): Promise<Person> {
        return new Promise<Person>((resolve, reject) => {
            resolve({ name: 'OK' });
        });
    }

    @swagger.ResponseDescription<Person>(201, 'Person Created', { name: 'Test Person' })
    @swagger.ResponseDescription<string>(401, 'Unauthorized')
    @swagger.ResponseExample<Person>({ name: 'Example Person' }) // NOTE: this is here to test that it doesn't overwrite the example in the @Response above
    @Post("")
    public testPost(obj: Person): Promise<Person> {
        return new Promise<Person>((resolve, reject) => {
            resolve({ name: 'OK' });
        });
    }

    @Get('myFile')
    @swagger.ResponseProduces('application/pdf')
    public testFile(@Query('testParam') test?: string): Promise<null> {
        return new Promise<null>((resolve, reject) => {
            resolve(null);
        });
    }
}

export class BasicModel {
    public id: number;
}

export class BasicEndpoint<T extends BasicModel>  {

    protected list(@Query('full') full?: boolean): Promise<T[]> {
        return new Promise((resolve, reject) => {
            // todo
        });
    }

    @Post("")
    protected save(entity: T): Promise<number> {
        return new Promise((resolve, reject) => {
            // todo
        });
    }

    @Put("")
    protected update(@Params('id') id: number, entity: T): Promise<void> {
        return new Promise((resolve, reject) => {
            // todo
        });
    }

    @Delete('/:id')
    protected remove(@Params('id') id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // todo
        });
    }

    @Get('/:id')
    protected get(@Params('id') id: string): Promise<T> {
        return new Promise((resolve, reject) => {
            // todo
        });
    }
}

export interface MyDatatype extends BasicModel {
    property1: string;
}

@Controller('generics1')
export class DerivedEndpoint extends BasicEndpoint<MyDatatype> {

    @Get(':param')
    protected test(@Params('param') param: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // content
        });
    }
}

export interface BasicModel2<T> {
    prop: T;
}

export interface MyDatatype2 extends BasicModel2<string> {
    property1: string;
}

@Controller('generics2')
export class DerivedEndpoint2 {

    @Get(':param')
    protected test(@Params('param') param: string): Promise<MyDatatype2> {
        return new Promise<MyDatatype2>((resolve, reject) => {
            // content
        });
    }
}

// tslint:disable-next-line: interface-over-type-literal
export type SimpleHelloType = {
    /**
     * Description for greeting property
     */
    greeting: string;
    arrayOfSomething: Something[];

    /**
     * Description for profile
     */
    profile: {
        /**
         * Description for profile name
         */
        name: string
    };

    comparePassword: (candidatePassword: string, cb: (err: any, isMatch: any) => {}) => void;
};

export interface Something {
    id: UUID;
    someone: string;
    kind: string;
}

export type UUID = string;

@Controller('type')
export class TypeEndpoint {
    @Get(':param')
    public test(@Params('param') param: string): Promise<MyDatatype2> {
        return new Promise<MyDatatype2>((resolve, reject) => {
            // content
        });
    }

    @Get(':param/2')
    public test2(@Params('param') param: string): Promise<SimpleHelloType> {
        return new Promise<SimpleHelloType>((resolve, reject) => {
            // content
        });
    }
}

export interface ResponseBody<T> {
    data: T;
}

export class PrimitiveClassModel {
    /**
     * An integer
     */
    @swagger.IsInt
    public int?: number;

    @swagger.IsLong
    public long?: number;

    @swagger.IsFloat
    public float?: number;

    @swagger.IsDouble
    public double?: number;
}

export interface PrimitiveInterfaceModel {
    /**
     * An integer
     * @IsInt
     */
    int?: number;

    /**
     * @IsLong
     */
    long?: number;

    /**
     * @IsFloat
     */
    float?: number;

    /**
     * @IsDouble
     */
    double?: number;
}

@Controller('primitives')
export class PrimitiveEndpoint {

    @Get('/class')
    public getClass(): PrimitiveClassModel {
        return new PrimitiveClassModel();
    }

    @Get('/interface')
    public testInterface(): PrimitiveInterfaceModel {
        return {};
    }

    @Get(':id')
    public getById(@Params('id') @swagger.IsLong id: number) {
        // ...
    }

    @Get('/arrayNative')
    // tslint:disable-next-line:array-type
    public getArrayNative(): ResponseBody<string[]> {
        return { data: ['hello', 'world'] };
    }

    @Get('/array')
    public getArray(): ResponseBody<string[]> {
        return { data: ['hello', 'world'] };
    }
}

@Controller('parameterized/:objectId')
export class ParameterizedEndpoint {

    @Get('/test')
    public test(@Params('objectId') objectId: string): PrimitiveClassModel {
        return new PrimitiveClassModel();
    }
}

export abstract class Entity {
    /**
     * A numeric identifier
     */
    public id?: number;
}

export class NamedEntity implements Entity {
    public id: number;
    public name: string;
}

@Controller('abstract')
export class AbstractEntityEndpoint {
    @Get("")
    public get(): NamedEntity {
        return new NamedEntity();
    }
}

@Controller('secure')
export class SecureEndpoint {
    @Get("")
    public get(): string {
        return 'Access Granted';
    }

    @Post("")
    public post(): string {
        return 'Posted';
    }
}

@Controller('supersecure')
export class SuperSecureEndpoint {
    @Get("")
    public get(): string {
        return 'Access Granted';
    }
}

@Controller('response')
@swagger.ResponseDescription<string>(400, 'The request format was incorrect.')
@swagger.ResponseDescription<string>(500, 'There was an unexpected error.')
export class ResponseController {
    @Get("")
    public get(): string {
        return '42';
    }

    @swagger.ResponseDescription<string>(401, 'Unauthorized.')
    @swagger.ResponseDescription<string>(502, 'Internal server error.')
    @Get('/test')
    public test(): string {
        return 'OK';
    }
}
