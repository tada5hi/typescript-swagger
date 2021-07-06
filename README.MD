[![npm version](https://badge.fury.io/js/typescript-swagger.svg)](https://badge.fury.io/js/typescript-swagger)
[![codecov](https://codecov.io/gh/Tada5hi/typescript-swagger/branch/master/graph/badge.svg?token=OATCN9VJR9)](https://codecov.io/gh/Tada5hi/typescript-swagger)
[![Master Workflow](https://github.com/Tada5hi/typescript-swagger/workflows/main/badge.svg)](https://github.com/Tada5hi/typescript-swagger)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/typescript-swagger/badge.svg?targetFile=package.json)](https://snyk.io/test/github/Tada5hi/typescript-swagger?targetFile=package.json)
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
  - [Specification](#specification)
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

In the following sections, the information/function which can be acquired by a decorator is called: `ID`.
The decorator the configuration (name/text, properties, ...) is called: `RepresentationConfig`.
Decorators must be declared and implemented according the requirements ([Specification](#specification)) for the respectively `Decorator.ID`.

### Representation

The following snippet, shows how the mapping between Decorator-ID(s) (`ID`) and the respectively (`RepresentationConfig`) 
representation config should look like.

```typescript
type Representation = Record<ID, RepresentationConfig | Array<RepresentationConfig>>;
```

The `ID` can have one of the following values: SWAGGER_TAGS, CLASS_PATH, ... [see more]().

The `RepresentationConfig` is defined as described in the following:
```typescript
interface RepresentationConfig {
    name: string;
    properties?: Array<Property>
}
```
The `name` attribute is representative for the actual decorator text/name.

For a few decorators the library expects different properties. How these properties/information
are available, should be provided by the `properties` attribute of the representation config.

```typescript
export type PropertyType = 'PAYLOAD' | 'STATUS_CODE' | 'DESCRIPTION' | 'OPTIONS' | 'SIMPLE' | 'TYPE';
export interface Property {
    /**
     * Default: 'SIMPLE'
     */
    type?: PropertyType;
    /**
     * Default: 'argument'
     */
    declaredAs?: 'argument' | 'typeArgument';
    /**
     * Default: one
     */
    amount?: 'one' | 'all';
    /**
     * Default: 0
     */
    position?: number;
}
```

If an attribute (type, declaredAs, amount, position) is not defined the default value will be applied.

Which `PropertyType(s)` are available for a given decorator is described in the ([Specification](#specification)) section.
In case for the build-in decorators the representation is defined as follows:
```typescript
import {Decorator} from 'typescript-swagger';

const representation: Decorator.Representation = {
  /**
   * ID: SWAGGER_TAGS
   * RepresentationConfig: {
   *     name: 'SwaggerTags',
   *     properties: [...]
   * }
   */
  SWAGGER_TAGS: {
    name: 'SwaggerTags',
    properties: [{amount: 'all', declaredAs: "argument"}]
  },
  
  // Class + Method
  RESPONSE_EXAMPLE: {
    name: 'ResponseExample',
    properties: [
      {type: "TYPE", declaredAs: "typeArgument"},
      {type: "PAYLOAD", declaredAs: "argument"}
    ]
  },
  RESPONSE_DESCRIPTION: {
    name: 'ResponseDescription',
    properties: [
      {type: "TYPE", declaredAs: "typeArgument"},
      {type: "STATUS_CODE", declaredAs: "argument", position: 0},
      {type: "DESCRIPTION", declaredAs: "argument", position: 1},
      {type: "PAYLOAD", declaredAs: "argument", position: 2}
    ]
  },
  REQUEST_CONSUMES: {
    name: 'RequestConsumes',
    properties: [{amount: 'all', declaredAs: "argument"}]
  },
  RESPONSE_PRODUCES: {
    name: 'ResponseProduces',
    properties: [{amount: 'all', declaredAs: "argument"}]
  },
  SWAGGER_HIDDEN: {
    name: 'SwaggerHidden',
    properties: []
  },
  
  IS_INT: {
    name: 'IsInt',
    properties: []
  },
  IS_LONG: {
    name: 'IsLong',
    properties: []
  },
  IS_FlOAT: {
    name: 'IsFloat',
    properties: []
  },
  IS_DOUBLE: {
    name: 'IsDouble',
    properties: []
  },
  SERVER_FILES_PARAM: {
    name: 'RequestFileParam',
    properties: [{}]
  },
  SERVER_FILE_PARAM: {
    name: 'RequestFileParam',
    properties: [{}]
  },
};

export default representation;
```
### Specification

How you can reference decorators, is described in the following.

#### SWAGGER_HIDDEN
Target:
- Class
- Method

Properties:

Example:
- Decorator: `@SwaggerHidden()`
- Representation:
  ```json
  {
    "SWAGGER_HIDDEN": {
      "name": "SwaggerHidden", 
      "properties": []
    }
  }
  ```
  
#### SWAGGER_TAGS
Target: 
- Class
- Method

Properties:
- SIMPLE:
  - Type: string | Array<string>
  - Description: assign the endpoint to one or more swagger tags.

Example:
- Decorator: `@SwaggerTags('tag-one')`, `@SwaggerTags('tag-one', 'tag-two')`
- Representation:
  ```json
  {
    "SWAGGER_TAGS": {
      "name": "SwaggerTags", 
      "properties": [
        {"amount": "all", "declaredAs": "argument"}
      ]
    }
  }
  ```

#### CLASS_PATH
Target: 
- Class

Properties: 
- SIMPLE: 
  - Type: string
  - Description: base path for methods in class
  
Example:
- Decorator: `@Path('/path')`
- Representation:
  ```json
  {
    "CLASS_PATH": {
      "name": "Path", 
      "properties": [
          {"amount": "one", "declaredAs": "argument"}
      ]
    }
  }
  ```

#### REQUEST_CONSUMES
Target:
- Class
- Method

Properties:
- SIMPLE:
  - Type: string | Array<string>
  - Description: supported media type(s) for request.

Example:
- Decorator: `@RequestConsumes('application/json')`, `@RequestConsumes('application/json', 'text/html')`
- Representation:
  ```json
  {
    "REQUEST_CONSUMES": {
      "name": "RequestConsumes", 
      "properties": [
          {"amount": "all", "declaredAs": "argument"}
      ]
    }
  }
  ```

#### RESPONSE_DESCRIPTION
Target:
- Class
- Method

Properties:
- TYPE:
  - Type: any
  - Description: (typescript) type of the example
- STATUS_CODE:
  - Type: number
  - Description: response status code (f.e 200)
- DESCRIPTION:
  - Type: string
  - Description: response description
- PAYLOAD:
  - Type: any
  - Description: example value or error of the description

Example:
- Decorator: `@ResponseDescription<{name: string}>(200, 'Return object with name attribute.', '{name: 'Peter'})`
- Representation
  ```json
  {
    "RESPONSE_DESCRIPTION": {
      "name": "ResponseDescription", 
      "properties": [
          {"type": "TYPE", "declaredAs": "typeArgument"},
          {"type": "STATUS_CODE", "declaredAs": "argument", "position": 0},
          {"type": "DESCRIPTION", "declaredAs": "argument", "position": 1},
          {"type": "PAYLOAD", "declaredAs": "argument", "position": 2}
      ]
    }
  }
  ```
  
#### RESPONSE_EXAMPLE
Target:
- Class
- Method

Properties:
- TYPE:
  - Type: any
  - Description: (typescript) type of the example
- PAYLOAD:
  - Type: any
  - Description: value of the example

Example:
- Decorator: `@ResponseExample<{name: string}>({name: 'Peter'})`
- Representation:
  ```json
  {
    "RESPONSE_EXAMPLE": {
      "name": "Path", 
      "properties": [
          {"type": "TYPE", "declaredAs": "typeArgument"}, 
          {"type": "PAYLOAD", "declaredAs": "argument"}
      ]
    }
  }
  ```
  
#### RESPONSE_PRODUCES
Target:
- Class
- Method

Properties:
- SIMPLE:
  - Type: string | Array<string>
  - Description: media type(s) available for a response message

Example:
- Decorator: `@ResponseProduces('application/json')`, `@ResponseProduces('application/json', 'text/html')`
- Representation:
  ```json
  {
    "RESPONSE_PRODUCES": {
      "name": "ResponseProduces", 
      "properties": [
          {"amount": "all", "declaredAs": "argument"}
      ]
    }
  }
  ```

#### METHOD_PATH
Target:
- Method

Properties:
- SIMPLE:
  - Type: string
  - Description: additional path specification to class path.

Example:
- Decorator: `@Path('/path')`
- Representation:
  ```json
  {
    "METHOD_PATH": {
      "name": "Path", 
      "properties": [
          {"amount": "one", "declaredAs": "argument"}
      ]
    }
  }
  ```
According to this schema you can:
- provide your own decorators used for route generation.
- override representations for a third party library
  (f.e [typescript-rest](https://github.com/thiagobustamante/typescript-rest)
  or
  [@decorators/express](https://github.com/serhiisol/node-decorators))

How to provide the representation for decorators is described in the section of the [swagger-config.json](#swagger-configjson).
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
The decorator contract is defined as followed:
```typescript 
import {Decorator} from 'typescript-swagger';

{
    useLibrary?: Decorator.Library | Array<Decorator.Library> | Record<Library, ID> | Record<Decorator.Library, Decorator.Representation>;
    useBuildIn?: boolean | Array<Decorator.ID> | Record<Decorator.ID, boolean> | Decorator.ID;
    override?: Decorator.Representation;
}
```

Please read the [Representation](#representation) section for further information to provide
valid values to override or extend library or build-in decorators.

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
