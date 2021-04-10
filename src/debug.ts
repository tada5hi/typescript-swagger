import debug, {Debugger} from "debug";

let instance : undefined | Debugger;

export function useDebugger() : Debugger {
    if(typeof instance !== 'undefined') {
        return instance;
    }

    const packageJson = require('../package.json');

    instance = debug(packageJson.name);

    return instance;
}
