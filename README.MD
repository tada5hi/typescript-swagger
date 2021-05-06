[![npm version](https://badge.fury.io/js/typescript-swagger.svg)](https://badge.fury.io/js/typescript-swagger)

# Swagger generation for decorator api(s) 🚀
This is a tool to generate swagger files from the following projects:
- [typescript-rest](https://github.com/thiagobustamante/typescript-rest)
- [@decorators/express](https://github.com/serhiisol/node-decorators)

**Table of Contents** 

- [Installation](#installation)
- [Limitations](#limitations)
- [Build](#build)
  - [CLI](#cli)
  - [Runtime](#runtime)
- [Decorator(s)](#decorators)
  - [Representation](#representation)
  - [Third-Party](#third-party)
    
- [Usage](#usage)
  - [General](#general)
  - [Build-In](#buildin)
    - [@ResponseDescription](#responsedescription)
    - [@ResponseExample](#responseexample)
    - [@ResponseProduces](#responseproduces)
    - [@RequestConsumes](#requestconsumes)
    - [@SwaggerTags](#swaggertags)
    - [@SwaggerHidden](#swaggerhidden)
    - [@IsInt, @IsLong, @IsFloat, @IsDouble](#isint-islong-isfloat-isdouble)
  - [swagger-config.json](#swaggerconfigjson)
- [Credits](#credits)

## Installation

```bash
npm install typescript-swagger -g
```


### Limitations

You can use pretty any type you have declared in your code. The only restriction are types form third party modules.

Also the following built in typescript utility types are supported:
* NonNullable
* Omit
* Partial
* Readonly
* Record
* Required
* Pick

## Build

You can either build the `swagger.yml` and `swagger.json` file by command line or on runtime of your application. 
The files will be generated in the `outputDirectory` specified in the `SwaggerConfig`.

The [tsconfig.json](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html) file contains the compilerOptions, which
are required for this library to work. The compilerOptions could look lke the following example:

```json
{
    "compilerOptions": {
        "baseUrl": ".",
        "paths": {
            "@/*": ["src/*"]
        }
    }
}
```
In case of the above configuration, the library can understand relative imports like `import something from '@/something'`.

### CLI

```bash
swaggerGen -c ./swaggerConfig.json
swaggerGen -c ./swaggerConfig.js #.js files are also allowed as config files
swaggerGen -c ./swaggerConfig.json -t # load {cwd}/tsconfig.json
swaggerGen -c ./swaggerConfig.json -p ./tsconfig.json # load custom tsconfig.json
```

Where the [swaggerConfig.json](#swaggerconfigjson) file, contains settings about the swagger generation. For example:

```json
{
    "swagger": {
        "outputDirectory": "./dist",
        "entryFile": "./tests/data/apis.ts"
    }
}
```

### Runtime

```typescript
import {SwaggerConfig, generateDocumentation} from "typescript-swagger";

const packageJson = require('package.json');
const tsConfig = require('tsconfig.json');

export const swaggerConfig: SwaggerConfig = {
  yaml: true,
  name: 'API - Documentation',
  description: packageJson.description,
  basePath: '/',
  version: packageJson.version,
  outputDirectory: 'public',
  entryFile: path.join('src', 'controllers', '**', '*.ts'),
  ignore: ['**/node_modules/**'],
  consumes: ['application/json'],
  produces: ['application/json']
}

export async function generateSwaggerDocumentation(): Promise<void> {
    await generateDocumentation(swaggerConfig, tsConfig);
}
```

## Decorator(s)

The information which are required to generate fully featured swagger documentations are collected by consulting decorators
present on your code.
Some decorators are already provided by this library and can be extended or replaced by other libraries (f.e @decorators/express or typescript-rest) or by 
own definitions.

In the following sections, the information/function which can be acquired by a decorator is called: `Decorator.ID`.
The decorator name/text itself is called: `Decorator.Representation`.
Decorators must be declared and implemented according the requirements for the respectively `Decorator.ID`.

### Representation

The following snippet, shows how the mapping between all ID(s) (`Decorator.ID(s)`) and the respectively (`Decorator.Representation`) 
representations are defined for the BuildIn decorators.

```typescript
return {
    // Class
    SWAGGER_TAGS: 'SwaggerTags',
    CLASS_PATH: undefined,

    // Class + Method
    REQUEST_ACCEPT: 'RequestAccept',
    RESPONSE_EXAMPLE: 'ResponseExample',
    RESPONSE_DESCRIPTION: 'ResponseDescription',
    REQUEST_CONSUMES: 'RequestConsumes',
    RESPONSE_PRODUCES: 'ResponseProduces',
    SWAGGER_HIDDEN: 'SwaggerHidden',

    // Method
    ALL: undefined,
    GET: undefined,
    POST: undefined,
    PUT: undefined,
    DELETE: undefined,
    PATCH: undefined,
    OPTIONS: undefined,
    HEAD: undefined,
    METHOD_PATH: undefined,

    // Parameter
    SERVER_CONTEXT: undefined,
    SERVER_PARAMS: undefined,
    SERVER_QUERY: undefined,
    SERVER_FORM: undefined,
    SERVER_BODY: 'ServerBody',
    SERVER_HEADERS: undefined,
    SERVER_COOKIES: undefined,
    SERVER_PATH_PARAMS: undefined,
    SERVER_FILES_PARAM: undefined,
    SERVER_FILE_PARAM: undefined,

    IS_INT: 'IsInt',
    IS_LONG: 'IsLong',
    IS_FlOAT: 'IsFloat',
    IS_DOUBLE: 'IsDouble'
}
```
According to this schema you can:
- provide your own decorators used for route generation.
- override representations for a third party library 
  (f.e [typescript-rest](https://github.com/thiagobustamante/typescript-rest) 
  or
  [@decorators/express](https://github.com/serhiisol/node-decorators))
  
How to use the build-in decorators in your code, is described in the following section:
[Build-In](#buildin)

## Usage

### General

The documentation will be generated consulting all decorators present on your code.

Which decorator will be used, depends on your [swagger-config.json](#swaggerconfigjson).
However, there are some additional information that only can be provided, through some third party decorator or your own defined representations.

To cover all functions the following decorators packs are supported by default:
* build-in
* [typescript-rest](https://github.com/thiagobustamante/typescript-rest)
* [@decorators/express](https://github.com/serhiisol/node-decorators)

You can override the used decorator packs in you [swagger-config.json](#swaggerconfigjson).

In the following there are two specific examples in combination with the third party libraries: typescript-rest and @decorators/express.

#### typescript-rest
```typescript
import {Path, Accept, GET} from 'typescript-rest';
import {SwaggerTags} from 'typescript-swagger';

interface Person {
    id: number;
    name: string;
    avatar: string;
    password: string;
}

@Path('mypath')
export class MyService {
    @GET
    @SwaggerTags('adminMethod', 'otherTag')
    @Accept('text/html')
    test( ): string {
        return 'OK';
    }

    @GET
    @Path('secondpath')
    test2( @QueryParam('testParam')test?: string ): Pick<Person, 'name' | 'avatar'> {
        return {name: 'OK'};
    }
}
```

#### @decorators/express
```typescript
import {Controller, Get, Query} from '@decorators/express';
import {SwaggerTags} from 'typescript-swagger';

interface Person {
    id: number;
    name: string;
    avatar: string;
    password: string;
}

@Controller('mypath')
export class MyService {
    @Get('')
    @SwaggerTags('adminMethod', 'otherTag')
    test( ): string {
        return res.send('Ok');
    }

    @Get('secondpath')
    test2( @Query('testParam')test?: string ): Pick<Person, 'name' | 'avatar'> {
        return res.json({name: 'OK'});
    }
}
```

It is also important to observe that all JsDoc provided on your methods, classes, and parameters is outputed into the generated swagger file:

```typescript
@Accept('text/plain')
@Path('mypath')
export class MyService {
    /**
     * This description will be used to describe the get operation of path '/mypath' on the generated swagger
     * @param test And this will describe the parameter test of this same operation
     */
    @GET
    @Path('secondpath')
    test2( @QueryParam('testParam')test?: string ): Person {
        return {name: 'OK'};
    }
}
```
### BuildIn

These are the available swagger decorators by this library:

#### @ResponseDescription

A decorator to document the responses that a given service method can return. It is used to generate documentation for the REST service.

```typescript
interface MyError {
   message: string
}

@Path('people')
class PeopleService {
  @ResponseDescription<string>(200, 'Retrieve a list of people.')
  @ResponseDescription<MyError>(401, 'The user is unauthorized.', {message: 'The user is not authorized to access this operation.'})
  @GET
  getPeople(@Param('name') name: string) {
     // ...
  }
}
```

A Default response is already created in swagger documentation from the method return analisys. So any response declared
through this decorator is an additional response created.

#### @ResponseExample

Used to provide an example of method return to be added into the method response section of the generated documentation for this method.

```typescript
@Path('people')
class PeopleService {
  @ResponseExample<Array<Person>>([{
    name: 'Joe'
  }])
  @GET
  getPeople(@Param('name') name: string): Person[] {
     // ...
  }
}
```

#### @ResponseProduces

Document the produces property in generated swagger docs

```typescript
@Path('people')
@ResponseProduces('text/html')
class PeopleService {
  @GET
  getPeople(@Param('name') name: string) {
     // ...
  }
}
```

A Default produces is already created in swagger documentation from the method return analisys.
You can use this decorator to override this default produces.

#### @RequestConsumes 

Document the consumes property in generated swagger docs

```typescript
@Path('people')
@RequestConsumes('text/html')
class PeopleService {
  @PUT
  createPeople(@Param('name') name: string, people: People) {
     // ...
  }
}
```

#### @SwaggerTags

Add tags for a given method on generated swagger documentation.

```typescript
@Path('people')
class PeopleService {
  @SwaggerTags('adiministrative', 'department1')
  @GET
  getPeople(@Param('name') name: string) {
     // ...
  }
}
```

#### @SwaggerHidden 

Allow to hide some APIs from swagger docs (ex: test or dev APIs, etc ...).
This decorator can be applied for the whole class or only a single method

```typescript
@Path('people')
@SwaggerHidden()
class PeopleService {
  @GET
  getPeople(@Param('name') name: string) {
     // ...
  }
}
```

#### @IsInt, @IsLong, @IsFloat, @IsDouble

Document the type of a `number` property or parameter in generated swagger docs.
If no decorator is present, the `number` type defaults to `double` format.

```typescript
class Person {
    @IsInt id: number;
}

@Path('people')
class PeopleService {
    @Path(':id')
    @GET
    getById(@PathParam('id') @IsLong id: number) {
        // ...
    }
}
```

Because decorators don't work on type and interface properties, this can also be specified as a JSDoc tag.

```typescript
interface Person {
    /**
     * The person's id
     * @IsInt
     */
    id: number;
}
```


### SwaggerConfig.json 

The swagger config file supports the following properties: 

Property | Type | Description
-------- | ---- | -----------
basePath | string | Base API path; e.g. the 'v1' in https://myapi.com/v1
consumes | [string] | Default consumes property for the entire API
description | string | API description; defaults to npm package description
entryFile | string or string[] | The entry point to your API (it is possible to use glob patters)
outputFormat | 'Swagger_2' or 'OpenApi_3' | Inform if the generated spec will be in swagger 2.0 format or i open api 3.0
host | string | The hostname to be informed in the generated swagger file
license | string | API license number; defaults to npm package license
name | string | API name; defaults to npm package name
outputDirectory | string | Where to write the generated swagger file
produces | [string] | Default produces property for the entire API
version | string | API version number; defaults to npm package version
yaml | boolean | Generates the output also as an yaml file 
spec | any | Extend generated swagger spec with this object. Note that generated properties will always take precedence over what get specified here
securityDefinitions | *SecurityDefinition | Security Definitions Object. A declaration of the security schemes available to be used in the specification. This does not enforce the security schemes on the operations and only serves to provide the relevant details for each scheme.
collectionFormat | string | Default collectionFormat property for the entire API. Possible values are `csv`, `ssv`, `tsv`, `pipes`, `multi`. If not specified, Swagger defaults to `csv`.


Where the SecurityDefinition contract is defined as:
```typescript 
{
    [name: string]: {
        type: string;
        name?: string;
        authorizationUrl?: string;
        tokenUrl?: string;
        flow?: string;
        in?: string;
        scopes?: { [scopeName: string]: string; }
    }
}
```

See an example:
```json
{
    "swagger": {
        "outputDirectory": "./dist",
        "entryFile": "./controllers/*.ts",
        "outputFormat": "openapi_3",
        "host": "localhost:3000",
        "version": "1.0",
        "name": "Typescript-rest Test API",
        "description": "a description",
        "license": "MIT",
        "basePath": "/v1",
        "securityDefinitions": {
            "api_key": {
                "type": "apiKey",
                "name": "access_token",
                "in": "query"
            }
        },
        "ignore": [
          "**/node_modules/**"
        ]
    }
}
```

or in yaml format:
See an example:

```yaml
swagger:
  outputDirectory: ./dist
  entryFile: 
    - ./controllers/*.ts
  outputFormat: openapi_3
  host: localhost:3000
  version: 1.0
  name: Typescript-rest Test API
  description: A description
  license: MIT
  basePath: /v1
  securityDefinitions:
    api_key:
      type: apiKey
      name: access_token
      in: query
  ignore:
    - /node_modules/**    
```

### Credits

It was originally a fork of the [typescript-rest-swagger](https://github.com/thiagobustamante/typescript-rest-swagger) project.
