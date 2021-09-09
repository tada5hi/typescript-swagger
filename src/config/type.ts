import {Decorator} from "../decorator/type";
import {Metadata} from "../metadata/type";
import {Swagger} from "../swagger";

export interface Config {
    /**
     * Swagger generation configuration object.
     */
    swagger: Swagger.Config;

    /**
     * Configuration for the metadata collection.
     */
    metadata: Metadata.Config;

    /**
     * Decorator config for decorator representations.
     */
    decorator?: Decorator.Config;
}
