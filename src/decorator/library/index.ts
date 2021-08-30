import {hasOwnProperty} from "../../metadata/resolver/utils";
import {Decorator} from "../type";
import {DecoratorExpressLibrary} from "./@decorators/express";
import {TypescriptRestLibrary} from "./typescript-rest";

export type Library = 'typescript-rest' | '@decorators/express';

export function isLibraryIncluded(library: Library, map?: Decorator.Config) : boolean {
    if(typeof map === 'undefined') {
        return false;
    }

    const useLibraryType = Object.prototype.toString.call(map.useLibrary);
    switch (useLibraryType) {
        case '[object String]':
            return map.useLibrary === library;
        case '[object Array]':
            return (map.useLibrary as Library[]).indexOf(library) !== -1;
        case '[object Object]':
            for(const key in (map.useLibrary as Record<Library, any>)) {
                if(key === library) {
                    return true;
                }    
            }
            
            return false;
    }

    return false;
}

export function findLibraryIDRepresentation(library: Library , key: Decorator.Type, map?: Decorator.Config) : Decorator.RepresentationConfig[] | Decorator.RepresentationConfig | undefined {
    if(typeof map === 'undefined') {
        return findRepresentationInConfig(library,key);
    }

    // check if library is included, if so check if library can provide representation.
    const useLibraryType = Object.prototype.toString.call(map.useLibrary);
    switch (useLibraryType) {
        case '[object String]':
            return (map.useLibrary as Library) === library ? findRepresentationInConfig(library, key) : undefined;
        case '[object Array]':
            return (map.useLibrary as Library[]).indexOf(library) !== -1 ? findRepresentationInConfig(library, key) : undefined;
        case '[object Object]':
            for(const recordKey in (map.useLibrary as Record<Library, any>)) {
                if(recordKey !== library) {
                    continue;
                }

                const item = (map.useLibrary as Record<Library, any>)[recordKey];

                // check if only specific keys should be taken, or if the config provides another one.
                const libraryType = Object.prototype.toString.call(item);
                switch (libraryType) {
                    case '[object String]':
                        return (item as string) === key ? findRepresentationInConfig(library, key) : undefined;
                    case '[object Array]':
                        // just allow specific keys of library.
                        return (item as string[]).indexOf(key) !== -1 ? findRepresentationInConfig(library, key) : undefined;
                    case '[object Object]':
                        return hasOwnProperty((item as Record<Decorator.Type, boolean>), key) && (item as Record<Decorator.Type, Decorator.RepresentationConfig>)[key] ? findRepresentationInConfig(library, key) : undefined;
                }
            }
    }

    return undefined;
}

function findRepresentationInConfig(library: Library, key: Decorator.Type) : Decorator.RepresentationConfig[] | Decorator.RepresentationConfig | undefined  {
    switch (library) {
        case "typescript-rest":
            if(hasOwnProperty(TypescriptRestLibrary.DecoratorRepresentations, key)) {
                return TypescriptRestLibrary.DecoratorRepresentations[key];
            }
            break;
        case "@decorators/express":
            if(hasOwnProperty(DecoratorExpressLibrary.DecoratorRepresentations, key)) {
                return DecoratorExpressLibrary.DecoratorRepresentations[key];
            }
            break;
    }

    return undefined;
}
