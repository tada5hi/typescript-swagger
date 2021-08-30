import {hasOwnProperty} from "../../metadata/resolver/utils";
import {Decorator} from "../type";

export const BuildInMap : Partial<Decorator.Representation> = {
    // Class
    SWAGGER_TAGS: {
        id: 'SwaggerTags',
        properties: [{amount: 'all', declaredAs: "argument"}]
    },

    // Class + Method
    RESPONSE_EXAMPLE: {
        id: 'ResponseExample',
        properties: [
            {type: "TYPE", declaredAs: "typeArgument"},
            {type: "PAYLOAD", declaredAs: "argument"}
        ]
    },
    RESPONSE_DESCRIPTION: {
        id: 'ResponseDescription',
        properties: [
            {type: "TYPE", declaredAs: "typeArgument"},
            {type: "STATUS_CODE", declaredAs: "argument", position: 0},
            {type: "DESCRIPTION", declaredAs: "argument", position: 1},
            {type: "PAYLOAD", declaredAs: "argument", position: 2}
        ]
    },
    REQUEST_CONSUMES: {
        id: 'RequestConsumes',
        properties: [{amount: 'all', declaredAs: "argument"}]
    },
    RESPONSE_PRODUCES: {
        id: 'ResponseProduces',
        properties: [{amount: 'all', declaredAs: "argument"}]
    },
    SWAGGER_HIDDEN: {
        id: 'SwaggerHidden',
        properties: []
    },

    IS_INT: {
        id: 'IsInt',
        properties: []
    },
    IS_LONG: {
        id: 'IsLong',
        properties: []
    },
    IS_FlOAT: {
        id: 'IsFloat',
        properties: []
    },
    IS_DOUBLE: {
        id: 'IsDouble',
        properties: []
    },

    SERVER_FILES_PARAM: {
        id: 'RequestFileParam',
        properties: [{}]
    },
    SERVER_FILE_PARAM: {
        id: 'RequestFileParam',
        properties: [{}]
    },
};

export function isBuildInIncluded(map?: Decorator.Config, id?: Decorator.Type) {
    if(typeof map === 'undefined' || typeof map.useBuildIn === 'undefined') {
        // Build in is always included by default.
        return true;
    }

    const useLibraryType = Object.prototype.toString.call(map.useBuildIn);
    switch (useLibraryType) {
        case '[object Boolean]':
            return map.useBuildIn;
        case '[object String]':
            return map.useBuildIn === id;
        case '[object Array]':
            return (map.useBuildIn as Decorator.Type[]).indexOf(id) !== -1;
        case '[object Object]':
            return hasOwnProperty((map.useBuildIn as Record<Decorator.Type, boolean>), id) && (map.useBuildIn as Record<Decorator.Type, boolean>)[id];
    }

    return true;
}

export function findBuildInIDRepresentation(id: Decorator.Type, map?: Decorator.Config) : Decorator.RepresentationConfig | Decorator.RepresentationConfig[] | undefined {
    if(typeof map === 'undefined') {
        return findRepresentationInBuildIn(id);
    }

    // check if library is included, if so check if library can provide representation.
    const useLibraryType = Object.prototype.toString.call(map.useBuildIn);
    switch (useLibraryType) {
        case '[object Boolean]':
            if(!map.useBuildIn) {
                return undefined;
            }
            break;
        case '[object String]':
            return (map.useBuildIn as Decorator.Type) === id ? findRepresentationInBuildIn(id) : undefined;
        case '[object Array]':
            return (map.useBuildIn as Decorator.Type[]).indexOf(id) !== -1 ? findRepresentationInBuildIn(id) : undefined;
        case '[object Object]':
            // tslint:disable-next-line:forin
            for(const recordKey in (map.useBuildIn as Record<Decorator.Type, boolean>)) {
                if(!hasOwnProperty((map.useBuildIn as Record<Decorator.Type, boolean>), recordKey)) {
                    continue;
                }

                const item : boolean = (map.useBuildIn as Record<Decorator.Type, boolean>)[recordKey as Decorator.Type];
                if (!item) {
                    continue;
                }

                return findRepresentationInBuildIn(recordKey as Decorator.Type);
            }
    }

    return findRepresentationInBuildIn(id);
}

export function findRepresentationInBuildIn(key: Decorator.Type) : Decorator.RepresentationConfig | Decorator.RepresentationConfig[] | undefined {

    if(hasOwnProperty(BuildInMap, key)) {
        return BuildInMap[key];
    }

    return undefined;
}
