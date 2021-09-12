import {Resolver} from "../resolver/type";
import {Metadata} from "../type";

export interface MetadataCacheData {
    sourceFileSize: number;
    controllers: Metadata.Controller[];
    referenceTypes: Resolver.ReferenceTypes;
}
