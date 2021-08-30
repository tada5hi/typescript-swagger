import {Decorator} from "../../type";

export namespace DecoratorExpressLibrary {
    export const DecoratorRepresentations : Partial<Decorator.Representation> = {
        // Class
        CLASS_PATH: {
            id: 'Controller',
            properties: [{}]
        },

        // Method
        METHOD_PATH: [
            {
                id: 'All',
                properties: [{}]
            },
            {
                id: 'Get',
                properties: [{}]
            },
            {
                id: 'Post',
                properties: [{}]
            },
            {
                id: 'Put',
                properties: [{}]
            },
            {
                id: 'Delete',
                properties: [{}]
            },
            {
                id: 'Patch',
                properties: [{}]
            },
            {
                id: 'Options',
                properties: [{}]
            },
            {
                id: 'Head',
                properties: [{}]
            }
        ],

        // Parameter
        SERVER_CONTEXT: [
            {
                id: 'Request',
                properties: []
            },
            {
                id: 'Response',
                properties: []
            },
            {
                id: 'Next',
                properties: []
            },
        ],
        SERVER_QUERY: {
            id: 'Query',
            properties: [{}]
        },
        SERVER_FORM: undefined,
        SERVER_BODY: {
            id: 'Body',
            properties: [{}]
        },
        SERVER_HEADERS: {
            id: 'Headers',
            properties: [{}]
        },
        SERVER_COOKIES: {
            id: 'Cookies',
            properties: [{}]
        },
        SERVER_PATH_PARAMS: {
            id: 'Params',
            properties: [{}]
        }
    };
}
