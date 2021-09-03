import {Swagger} from "./index";

export namespace SwaggerV3 {
    import BaseParameter = Swagger.BaseParameter;

    export interface Spec extends Swagger.BaseSpec {
        openapi: '3.0.0';
        servers: Server[];
        components: Components;
        paths: Paths;
    }

    // Server
    export interface Server {
        url: string;
        description?: string;
        variables?: Record<string, Variable>;
    }

    export interface Variable {
        enum?: string[];
        description?: string;
        default: string;
    }

    // Components
    export interface Components {
        callbacks?: { [name: string]: any };
        examples?: { [name: string]: Swagger.Example | string };
        headers?: { [name: string]: any };
        links?: { [name: string]: any };
        parameters?: { [name: string]: Parameter };
        requestBodies?: { [name: string]: any };
        responses?: { [name: string]: Response };
        schemas?: { [name: string]: Schema };
        securitySchemes?: { [name: string]: Security };
    }


    // Paths
    export interface Paths {
        [key: string] : Swagger.Path<Operation, Parameter>;
    }

    export type Parameter = Swagger.Parameter<Schema>;

    export interface Operation extends Swagger.BaseOperation<Parameter, Response, Security> {
        requestBody?: RequestBody;
        [key: string]: unknown;
    }

    export interface Response extends Swagger.BaseResponse {
        content?: { [name: string]: Schema & Swagger.Examples };
        headers?: { [name: string]: Header };
    }

    export type Header = Partial<Pick<BaseParameter<Schema>, 'name' | 'in'>> & Omit<BaseParameter<Schema>, 'name' | 'in'>;

    export interface RequestBody {
        content: { [name: string]: MediaType };
        description?: string;
        required?: boolean;
    }

    export interface MediaType {
        schema?: Schema;
        example?: unknown;
        examples?: { [name: string]: Swagger.Example | string };
        encoding?: { [name: string]: any };
    }

    // tslint:disable-next-line:no-shadowed-variable
    export interface Schema extends Swagger.BaseSchema<Schema> {
        nullable?: boolean;
        anyOf?: Schema[];
        allOf?: Schema[];
        deprecated?: boolean;
    }

    // tslint:disable-next-line:no-shadowed-variable
    export interface BasicSecurity extends Swagger.BaseSecurity {
        type: 'http';
        schema: 'basic';
    }

    export interface OAuth2Security extends Swagger.BaseSecurity {
        type: 'oauth2';
        flows: {
            implicit?: OAuth2ImplicitFlow,
            password?: OAuth2PasswordFlow,
            authorizationCode?: OAuth2AuthorizationCodeFlow,
            clientCredentials?: OAuth2ClientCredentialsFlow
        };
    }

    export interface Oauth2BaseFlow {
        scopes?: Record<string, string>;
        refreshUrl?: string;
    }

    export interface OAuth2ImplicitFlow extends Oauth2BaseFlow{
        authorizationUrl: string;
    }

    export interface OAuth2PasswordFlow extends Oauth2BaseFlow{
        tokenUrl: string;
    }

    export interface OAuth2AuthorizationCodeFlow extends Oauth2BaseFlow{
        authorizationUrl: string;
        tokenUrl: string;
    }

    export interface OAuth2ClientCredentialsFlow extends Oauth2BaseFlow{
        tokenUrl: string;
    }

    export type Security =
        BasicSecurity |
        OAuth2Security |
        Swagger.ApiKeySecurity;
}
