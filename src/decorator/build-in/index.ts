import {hasOwnProperty} from "../../metadata/resolver/utils";
import {Decorator} from "../type";

export const BuildInMap : Partial<Decorator.Representation> = {
    // Class
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

export function isBuildInIncluded(map?: Decorator.Config, id?: Decorator.ID) {
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
            return (map.useBuildIn as Array<Decorator.ID>).indexOf(id) !== -1;
        case '[object Object]':
            return hasOwnProperty((map.useBuildIn as Record<Decorator.ID, boolean>), id) && (map.useBuildIn as Record<Decorator.ID, boolean>)[id];
    }

    return true;
}

export function findBuildInIDRepresentation(id: Decorator.ID, map?: Decorator.Config) : Decorator.RepresentationConfig | Array<Decorator.RepresentationConfig> | undefined {
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
            return (map.useBuildIn as Decorator.ID) === id ? findRepresentationInBuildIn(id) : undefined;
        case '[object Array]':
            return (map.useBuildIn as Array<Decorator.ID>).indexOf(id) !== -1 ? findRepresentationInBuildIn(id) : undefined;
        case '[object Object]':
            // tslint:disable-next-line:forin
            for(const recordKey in (map.useBuildIn as Record<Decorator.ID, boolean>)) {
                if(!hasOwnProperty((map.useBuildIn as Record<Decorator.ID, boolean>), recordKey)) {
                    continue;
                }

                const item : boolean = (map.useBuildIn as Record<Decorator.ID, boolean>)[recordKey as Decorator.ID];
                if (!item) {
                    continue;
                }

                return findRepresentationInBuildIn(recordKey as Decorator.ID);
            }
    }

    return findRepresentationInBuildIn(id);
}

export function findRepresentationInBuildIn(key: Decorator.ID) : Decorator.RepresentationConfig | Array<Decorator.RepresentationConfig> | undefined {

    if(hasOwnProperty(BuildInMap, key)) {
        return BuildInMap[key];
    }

    return undefined;
}
