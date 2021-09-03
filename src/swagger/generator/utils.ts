export function removeRepeatingCharacter(str: string) : string {
    return str.replace(/([^:]\/)\/+/g, "$1");
}

export function removeFinalCharacter(str: string, character: string) {
    while(str.charAt(str.length - 1) === character && str.length > 0) {
        str = str.slice(0, -1);
    }

    return str;
}
