import {Identifier, isJSDocParameterTag, JSDoc, JSDocTag, Node, SyntaxKind} from 'typescript';
import {ResolverError} from "../metadata/resolver/error";

// -----------------------------------------
// Description
// -----------------------------------------
export function getJSDocDescription(node: Node) : string | undefined {
    const jsDocs = (node as any).jsDoc as Array<JSDoc>;
    if (!jsDocs || !jsDocs.length) { return ''; }

    return jsDocs[0].comment || undefined;
}


// -----------------------------------------
// Tag
// -----------------------------------------
export function getMatchingJSDocTags(node: Node, isMatching: (t: JSDocTag) => boolean) : Array<JSDocTag> {
    const jsDocs = (node as any).jsDoc as Array<JSDoc>;
    if (!jsDocs || !jsDocs.length) { return undefined; }

    const jsDoc = jsDocs[0];
    if (!jsDoc.tags) { return []; }

    return jsDoc.tags.filter(isMatching);
}

export function isExistJSDocTag(node: Node, tagName: ((tag: JSDocTag) => boolean) | string) : boolean {
    let tags : Array<JSDocTag>;

    if(typeof tagName === 'string') {
        tags = getJSDocTags(node, tagName);
    } else {
        tags = getMatchingJSDocTags(node, tagName);
    }

    return !(!tags || !tags.length);
}

export function getJSDocTags(node: Node, tagName: string) : Array<JSDocTag> {
    return getMatchingJSDocTags(node, t => t.tagName.text === tagName);
}

// -----------------------------------------
// Tag Comment(s)
// -----------------------------------------

export function getJSDocTagComment(node: Node, tagName: ((tag: JSDocTag) => boolean) | string) : undefined | string {
    let tags : Array<JSDocTag>;

    if(typeof tagName === 'string') {
        tags = getJSDocTags(node, tagName);
    } else {
        tags = getMatchingJSDocTags(node, tagName);
    }

    if (!tags || !tags.length) {
        return undefined;
    }
    return tags[0].comment;
}

// -----------------------------------------
// Tag Names
// -----------------------------------------

export function getJSDocTagNames(node: Node, requireTagName = false) : Array<string> {
    let tags: Array<JSDocTag> = [];

    if (node.kind === SyntaxKind.Parameter) {
        const parameterName = ((node as any).name as Identifier).text;
        tags = getMatchingJSDocTags(node.parent as any, tag => {
            if (isJSDocParameterTag(tag)) {
                return false;
            } else if (tag.comment === undefined) {
                throw new ResolverError(`Orphan tag: @${String(tag.tagName.text || tag.tagName.escapedText)} should have a parameter name follows with.`);
            }
            return tag.comment.startsWith(parameterName);
        });
    } else {
        tags = getMatchingJSDocTags(node as any, tag => {
            return requireTagName ? tag.comment !== undefined : true;
        });
    }

    if(typeof tags === 'undefined') {
        return [];
    }

    return tags.map(tag => {
        return tag.tagName.text;
    });
}


export function getFirstMatchingJSDocTagName(node: Node, isMatching: (t: JSDocTag) => boolean) : string | undefined {
    const tags = getMatchingJSDocTags(node, isMatching);
    if (!tags || !tags.length) { return undefined; }

    return tags[0].tagName.text;
}
