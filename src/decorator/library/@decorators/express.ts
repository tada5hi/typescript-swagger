import {Decorator} from "../../type";

export namespace DecoratorExpressLibrary {
    export const DecoratorRepresentations : Partial<Decorator.Representation> = {
        // Class
        CLASS_PATH: {
            name: 'Controller',
            properties: [{}]
        },

        // Method
        METHOD_PATH: [
            {
                name: 'All',
                properties: [{}]
            },
            {
                name: 'Get',
                properties: [{}]
            },
            {
                name: 'Post',
                properties: [{}]
            },
            {
                name: 'Put',
                properties: [{}]
            },
            {
                name: 'Delete',
                properties: [{}]
            },
            {
                name: 'Patch',
                properties: [{}]
            },
            {
                name: 'Options',
                properties: [{}]
            },
            {
                name: 'Head',
                properties: [{}]
            }
        ],

        // Parameter
        SERVER_CONTEXT: [
            {
                name: 'Request',
                properties: []
            },
            {
                name: 'Response',
                properties: []
            },
            {
                name: 'Next',
                properties: []
            },
        ],
        SERVER_QUERY: {
            name: 'Query',
            properties: [{}]
        },
        SERVER_FORM: undefined,
        SERVER_BODY: {
            name: 'Body',
            properties: [{}]
        },
        SERVER_HEADERS: {
            name: 'Headers',
            properties: [{}]
        },
        SERVER_COOKIES: {
            name: 'Cookies',
            properties: [{}]
        },
        SERVER_PATH_PARAMS: {
            name: 'Params',
            properties: [{}]
        }
    };
}
