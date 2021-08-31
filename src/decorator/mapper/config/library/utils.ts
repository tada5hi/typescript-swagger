import {Decorator} from "../../../type";
import {DecoratorExpressLibrary} from "./decorators-express";
import {TypescriptRestLibrary} from "./typescript-rest";

export function getLibraryMapping(library: Decorator.Library) : Decorator.TypeRepresentationMapping | undefined {
    switch (library) {
        case "@decorators/express":
            return DecoratorExpressLibrary.DecoratorRepresentations;
        case "typescript-rest":
            return TypescriptRestLibrary.DecoratorRepresentations;
    }

    return undefined;
}
