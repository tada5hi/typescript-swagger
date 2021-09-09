import {
    Swagger
} from "./index";

export namespace SwaggerV2 {
    export interface Spec extends Swagger.BaseSpec {
        swagger: '2.0';
        host?: string;
        basePath?: string;
        schemes?: string[];
        consumes?: string[];
        produces?: string[];
        paths: { [pathName: string]: Swagger.Path<Operation, Response> };
        definitions?: { [definitionsName: string]: Schema };
        parameters?: { [parameterName: string]: Schema | Swagger.QueryParameter<Schema> };
        responses?: { [responseName: string]: Response };
        security?: Security[];
        securityDefinitions?: { [name: string]: Security };
    }

    export type Parameter = Omit<Swagger.Parameter<Schema> & {'x-deprecated'?: boolean }, 'deprecated'>;

    export interface Operation extends Swagger.BaseOperation<Parameter, Response, Security> {
        produces?: [string];
    }

    export interface Response extends Swagger.BaseResponse{
        schema?: Schema;
        headers?: { [headerName: string]: Header };
        examples?: { [exampleName: string]: Swagger.Example };
    }

    export interface Header {
        type: 'string' | 'number' | 'integer' | 'boolean' | 'array';
    }

    // tslint:disable-next-line:no-shadowed-variable
    export interface Schema extends Swagger.BaseSchema<Schema> {
        ['x-nullable']?: boolean;
        ['x-deprecated']?: boolean;
    }

    export interface BasicSecurity extends Swagger.BaseSecurity {
        type: 'basic';
    }

    export interface BaseOAuthSecurity extends Swagger.BaseSecurity {
        type: 'oauth2';
    }

    export interface OAuth2ImplicitSecurity extends BaseOAuthSecurity {
        flow: 'implicit';
        authorizationUrl: string;
        scopes?: Record<string, string>;
    }

    export interface OAuth2PasswordSecurity extends BaseOAuthSecurity {
        flow: 'password';
        tokenUrl: string;
        scopes?: Record<string, string>;
    }

    export interface OAuth2ApplicationSecurity extends BaseOAuthSecurity {
        flow: 'application';
        tokenUrl: string;
        scopes?: Record<string, string>;
    }

    export interface OAuth2AccessCodeSecurity extends BaseOAuthSecurity {
        flow: 'accessCode';
        tokenUrl: string;
        authorizationUrl: string;
        scopes?: Record<string, string>;
    }

    export type OAuth2Security = OAuth2AccessCodeSecurity |
        OAuth2ApplicationSecurity |
        OAuth2ImplicitSecurity |
        OAuth2PasswordSecurity;

    export type Security =
        BasicSecurity |
        OAuth2Security |
        Swagger.ApiKeySecurity;
}
