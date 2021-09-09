import {Node} from "typescript";
import {hasOwnProperty} from "../../metadata/resolver/utils";
import {RepresentationManager} from "../representation";
import {Decorator} from "../type";
import {getDecorators} from "../utils/index";
import {InternalMapping} from "./config/internal";
import {getLibraryMapping} from "./config/library/utils";
import {isMappingTypeIncluded, reduceTypeRepresentationMapping} from "./utils";

export class DecoratorMapper {
    protected mapping : Partial<Decorator.TypeRepresentationMap>;

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
    public match<T extends Decorator.Type>(
        type: T,
        data: Decorator.Data[] | Node
    ) {
        if(!hasOwnProperty(this.mapping, type)) {
            return undefined;
        }

        const decorators : Decorator.Data[] = Array.isArray(data) ? data : getDecorators(data);

        const representations : Array<Decorator.Representation<T>> | Decorator.Representation<T> = this.mapping[type] as Array<Decorator.Representation<T>>;
        if(Array.isArray(representations)) {
            for(let i=0; i<representations.length; i++) {
                const items = decorators.filter(decorator => decorator.text === representations[i].id);
                if(items.length > 0) {
                    return new RepresentationManager<T>(
                        representations[i],
                        items
                    );
                }
            }
        } else {
            const items = decorators.filter(decorator => decorator.text === (representations as Decorator.Representation<T>).id);
            if(items.length > 0) {
                return new RepresentationManager<T>(
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

        const items : Array<Partial<Decorator.TypeRepresentationMap>> = [];

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
    private merge(...mappings: Array<Partial<Decorator.TypeRepresentationMap>>) : Partial<Decorator.TypeRepresentationMap> {
        const result : Partial<Decorator.TypeRepresentationMap> = {};

        // we need all available mapping keys :)
        let keys : Decorator.Type[] = mappings
            .map(mapping => Object.keys(mapping))
            .reduce(((previousValue, currentValue) => [...previousValue, ...currentValue])) as Decorator.Type[];

        keys = Array.from(new Set(keys));

        for(let i=0; i<keys.length; i++) {
            const representations : Array<Decorator.Representation<any>> = [];

            for(let j=0; j<mappings.length; j++) {
                if(hasOwnProperty(mappings[j], keys[i])) {
                    const value : Decorator.Representation<any> | Array<Decorator.Representation<any>> = mappings[j][keys[i]];

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

            // @ts-ignore
            result[keys[i]] = representations;
        }

        return result;
    }
}
