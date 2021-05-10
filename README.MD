[![npm version](https://badge.fury.io/js/typescript-swagger.svg)](https://badge.fury.io/js/typescript-swagger)

# Swagger generation for decorator api(s) 🚀
This is a tool to generate swagger files from a decorator library or your own definitions.

Please read the `CHANGELOG.md` in the repository for breaking changes.

**Table of Contents** 

- [Installation](#installation)

- [Build](#build)
  - [CLI](#cli)
  - [Runtime](#runtime)
- [Limitations](#limitations)
- [Decorator(s)](#decorators)
  - [Representation](#representation)
  - [Specification](#sepecification)
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
  - [SwaggerConfig (swagger-config.json)](#swagger-configjson)
    - [DecoratorConfig](#decoratorconfig)
    - [SecurityDefinition](#securitydefinition)
- [Credits](#credits)

## Installation

```bash
npm install typescript-swagger -g
```

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
swagger-generate -c ./swagger-config.json
swagger-generate -c ./swagger-config.js #.js files are also allowed as config files
swagger-generate -c ./swagger-config.json -t # load {cwd}/tsconfig.json
swagger-generate -c ./swagger-config.json -p ./tsconfig.json # load custom tsconfig.json
```

Where the [swagger-config.json](#swagger-configjson) file, contains settings about the swagger generation. For example:

```json
{
    "swagger": {
        "outputDirectory": "./dist",
        "entryFile": "./tests/data/apis.ts",
        "decoratorConfig": {
            "useBuildIn": true,
            "useLibrary": ["typescript-rest", "@decorators/express"]
        }
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
  decoratorConfig: {
     useBuildIn: true,
     useLibrary: ["typescript-rest", "@decorators/express"],
  },
  ignore: ['**/node_modules/**'],
  consumes: ['application/json'],
  produces: ['application/json']
}

export async function generateSwaggerDocumentation(): Promise<void> {
    await generateDocumentation(swaggerConfig, tsConfig);
}
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

## Decorator(s)

The information which are required to generate fully featured swagger documentations are collected by consulting decorators
present on your code.
Few decorator representations are already provided by this library and can also be disabled. 
Decorator representation by third party libraries (f.e @decorators/express or typescript-rest) can be  extended/replaced as well.
You can also deposit your own decorator as a representation.

In the following sections, the information/function which can be acquired by a decorator is called: `Decorator.ID`.
The decorator name/text itself is called: `Decorator.Representation`.
Decorators must be declared and implemented according the requirements ([Specification](#specification)) for the respectively `Decorator.ID`.

### Representation

The following snippet, shows how the mapping between all ID(s) (`Decorator.ID(s)`) and the respectively (`Decorator.Representation`) 
representations are defined for the BuildIn decorators.

```typescript
import {Decorator} from 'typescript-swagger';

const representation: Decorator.Representation = {
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
};

export default representation;
```
According to this schema you can:
- provide your own decorators used for route generation.
- override representations for a third party library 
  (f.e [typescript-rest](https://github.com/thiagobustamante/typescript-rest) 
  or
  [@decorators/express](https://github.com/serhiisol/node-decorators))
  
How to use the build-in decorators in your code, is described in the following section:
[Build-In](#buildin)

### Specification

The specification how the decorator(s) mus be designed, is described in the following:


## Usage

### General

The documentation will be generated consulting all decorators present on your code.

Which decorator will be used, depends on your [swagger-config.json](#swagger-configjson).
However, there are some additional information that only can be provided, through some third party decorator or your own defined representations.

To cover all functions the following decorators packs are supported by default:
* build-in
* [typescript-rest](https://github.com/thiagobustamante/typescript-rest)
* [@decorators/express](https://github.com/serhiisol/node-decorators)

You can override the used decorator packs in you [swagger-config.json](#swagger-configjson).

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

It is also important to notice that all JsDoc (Comments, Tags, ...) provided on your methods, classes, and parameters have influence on the generated swagger file:

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

The provided swagger decorator representations by this library, are listed in the following sections.

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


### Swagger-config.json 

The swagger config file supports the following properties: 

Property | Type | Default | Description
-------- | ---- | ----- | -----------
basePath | string | `"/"` | Base API path; e.g. the 'v1' in https://myapi.com/v1
collectionFormat | string | `"csv"` | Default collectionFormat property for the entire API. Possible values are `csv`, `ssv`, `tsv`, `pipes`, `multi`. If not specified, Swagger defaults to `csv`.
consumes | [string] | `[]` | Default consumes property for the entire API
decoratorConfig | *DecoratorConfig | `{ "useBuildIn": true, "useLibrary": ["typescript-rest", "@decorators/express"] }` | Configuration for own and third-party decorator representations.
description | string |  | API description; defaults to npm package description
entryFile | string or string[] | `[]` | The entry point to your API (it is possible to use glob patters)
host | string | | The hostname to be informed in the generated swagger file
license | string |  |  API license number; defaults to npm package license
name | string |  |  API name; defaults to npm package name
outputDirectory | string | | Where to write the generated swagger file
outputFormat | 'Swagger_2' or 'OpenApi_3' | `"Swagger_2"` | Inform if the generated spec will be in swagger 2.0 format or i open api 3.0
produces | [string] | | Default produces property for the entire API
spec | any | | Extend generated swagger spec with this object. Note that generated properties will always take precedence over what get specified here
securityDefinitions | *SecurityDefinition | | Security Definitions Object. A declaration of the security schemes available to be used in the specification. This does not enforce the security schemes on the operations and only serves to provide the relevant details for each scheme.
version | string | `0.0.1` | API version number; defaults to npm package version
yaml | boolean | `true` | Generates the output also as a yaml file


#### SecurityDefinition
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

#### DecoratorConfig
The decorator contact is defined as:
```typescript 
import {Decorator} from 'typescript-swagger';

{
    useLibrary?: Decorator.Library | Array<Decorator.Library> | Record<Library, ID> | Record<Decorator.Library, Decorator.Representation>;
    useBuildIn?: boolean | Array<Decorator.ID> | Record<Decorator.ID, boolean> | Decorator.ID;
    override?: Decorator.Representation;
}
```

The referenced type(s) in the `Decorator` namespace are defined as follows:

```typescript 
export type Library = 'typescript-rest' | '@decorators/express';
export type Representation = Record<ID, string | Array<string>>;

export type ID = ClassID | MethodID | ParameterID;

export type ClassID =
    'SWAGGER_TAGS' |
    'CLASS_PATH' |
    MethodAndCLassID
    ;

export type MethodAndCLassID =
    'REQUEST_ACCEPT' |
    'RESPONSE_EXAMPLE' |
    'RESPONSE_DESCRIPTION' |
    'REQUEST_CONSUMES' |
    'RESPONSE_PRODUCES' |
    'SWAGGER_HIDDEN'
    ;

export type MethodHttpVerbID =
    'ALL' |
    'GET' |
    'POST' |
    'PUT' |
    'DELETE' |
    'PATCH' |
    'OPTIONS' |
    'HEAD';

export type MethodID =
    'METHOD_PATH' |
    MethodHttpVerbID |
    MethodAndCLassID
    ;

export type ParameterID =
    ParameterServerID |
    'IS_INT' |
    'IS_LONG' |
    'IS_FlOAT' |
    'IS_DOUBLE'
    ;

export type ParameterServerID =
    'SERVER_CONTEXT' |
    'SERVER_PARAMS' |
    'SERVER_QUERY' |
    'SERVER_FORM' |
    'SERVER_BODY' |
    'SERVER_HEADERS' |
    'SERVER_COOKIES' |
    'SERVER_PATH_PARAMS' |
    'SERVER_FILE_PARAM' |
    'SERVER_FILES_PARAM';
```


#### Example

See an example:
```json
{
    "swagger": {
        "outputDirectory": "./dist",
        "entryFile": "./controllers/*.ts",
        "decoratorConfig": {
            "useBuildIn": true,
            "useLibrary": ["typescript-rest", "@decorators/express"]
        },
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
  decoratorConfig:
    useBuildIn: true
    useLibrary:
      - @decorators/express
      - typescript-rest
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
