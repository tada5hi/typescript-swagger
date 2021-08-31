import {Node} from "typescript";
import {hasOwnProperty} from "../../metadata/resolver/utils";
import {RepresentationManager} from "../representation";
import {Decorator} from "../type";
import {getDecorators} from "../utils";
import {InternalMapping} from "./config/internal";
import {getLibraryMapping} from "./config/library/utils";
import {isMappingTypeIncluded, reduceTypeRepresentationMapping} from "./utils";

export class DecoratorMapper {
    protected mapping : Decorator.TypeRepresentationMapping;

    constructor(
        protected config?: Decorator.Config
    ) {
        this.aggregate();
    }

    /**
     * Try to find a matching representation for a given decorator type and decorators or node.
     *
     * @param type
     * @param data
     */
    public match(
        type: Decorator.Type,
        data: Decorator.Data[] | Node
    ) {
        if(!hasOwnProperty(this.mapping, type)) {
            return undefined;
        }

        const decorators : Decorator.Data[] = Array.isArray(data) ? data : getDecorators(data);

        const representations = this.mapping[type];
        if(Array.isArray(representations)) {
            for(let i=0; i<representations.length; i++) {
                const items = decorators.filter(decorator => decorator.text === representations[i].id);
                if(items.length > 0) {
                    return new RepresentationManager(
                        representations[i],
                        items
                    );
                }
            }
        } else {
            const items = decorators.filter(decorator => decorator.text === representations.id);
            if(items.length > 0) {
                return new RepresentationManager(
                    representations,
                    items
                );
            }
        }

        return undefined;
    }

    // -------------------------------------------

    private aggregate() : void {
        if(typeof this.config === 'undefined') {
            return;
        }

        const items : Decorator.TypeRepresentationMapping[] = [];

        // mapping - internal
        if(typeof this.config.useBuildIn === 'undefined') {
            items.push(InternalMapping);
        } else {
            items.push(
                reduceTypeRepresentationMapping(InternalMapping, (type) => {
                    return isMappingTypeIncluded(type, this.config.useBuildIn);
                })
            );
        }

        // mapping - extension
        if(typeof this.config.override !== 'undefined') {
            items.push(this.config.override);
        }

        // mapping - library
        if(typeof this.config.useLibrary !== 'undefined') {
            // check if string or string[]

            if(
                typeof this.config.useLibrary === 'string' ||
                Array.isArray(this.config.useLibrary)
            ) {
                const libraries : Decorator.Library[] = Array.isArray(this.config.useLibrary) ?
                    this.config.useLibrary :
                    [this.config.useLibrary];

                items.push(...libraries.map(library => getLibraryMapping(library)));
            } else {
                // tslint:disable-next-line:forin
                for(const key in this.config.useLibrary) {
                    items.push(
                        reduceTypeRepresentationMapping(getLibraryMapping(key as Decorator.Library), (type) => {
                            return isMappingTypeIncluded(type, this.config.useBuildIn);
                        })
                    );
                }
            }
        }

        this.mapping = this.merge(...items);
    }

    /**
     * Merge decorator type-representation mappings of different libraries together.
     *
     * @param mappings
     * @private
     */
    private merge(...mappings: Decorator.TypeRepresentationMapping[]) : Decorator.TypeRepresentationMapping {
        const result : Decorator.TypeRepresentationMapping = {} as Decorator.TypeRepresentationMapping;

        // we need all available mapping keys :)
        let keys : Decorator.Type[] = mappings
            .map(mapping => Object.keys(mapping))
            .reduce(((previousValue, currentValue) => [...previousValue, ...currentValue])) as Decorator.Type[];

        keys = Array.from(new Set(keys));

        for(let i=0; i<keys.length; i++) {
            const representations : Decorator.Representation[] = [];

            for(let j=0; j<mappings.length; j++) {
                if(hasOwnProperty(mappings[j], keys[i])) {
                    const value = mappings[j][keys[i]];

                    if(typeof value === 'undefined') {
                        continue;
                    }

                    if(Array.isArray(value)) {
                        representations.push(...value);
                    } else {
                        representations.push(value);
                    }
                }
            }

            result[keys[i]] = representations;
        }

        return result;
    }
}
