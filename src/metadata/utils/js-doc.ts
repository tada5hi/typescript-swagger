import {Identifier, isJSDocParameterTag, JSDoc, JSDocTag, Node, SyntaxKind} from 'typescript';
import {ResolverError} from "../resolver/error";
import {hasOwnProperty} from "../resolver/utils";

// -----------------------------------------
// Description
// -----------------------------------------
export function getJSDocDescription(node: Node) : string | undefined {
    if(!hasOwnProperty(node, 'jsDoc')) {
        return undefined;
    }

    const jsDocs = (node.jsDoc as JSDoc[])
        .filter(jsDoc => typeof jsDoc.comment === 'string');

    if (jsDocs.length === 0) {
        return undefined;
    }

    return jsDocs[0].comment;
}


// -----------------------------------------
// Tag
// -----------------------------------------

function getJSDoc(node: Node, index?: number) : undefined | JSDoc {
    if(!hasOwnProperty(node, 'jsDoc')) {
        return undefined;
    }

    if(!node.jsDoc || !Array.isArray(node.jsDoc) || !node.jsDoc.length) {
        return undefined;
    }

    index = index ?? 0;
    return node.jsDoc.length > index && index >= 0 ? node.jsDoc[index] : node.jsDoc[0];
}

function getJSDocTags(
    node: Node,
    isMatching?: string | string[] | ((tag: JSDocTag) => boolean)
) : JSDocTag[] {
    const jsDoc : JSDoc = getJSDoc(node);
    if(typeof jsDoc === 'undefined') {
        return [];
    }

    const jsDocTags : JSDocTag[] = jsDoc.tags as unknown as JSDocTag[];

    if(typeof jsDocTags === 'undefined') {
        return [];
    }

    if(typeof isMatching === 'undefined') {
        return jsDocTags;
    }

    if(typeof isMatching === 'function') {
        return jsDocTags.filter(isMatching);
    }

    const tagNames : string[] = Array.isArray(isMatching) ? isMatching : [isMatching];

    return jsDocTags.filter(tag => tagNames.indexOf(tag.tagName.text) !== -1);
}

export function isExistJSDocTag(node: Node, tagName: ((tag: JSDocTag) => boolean) | string) : boolean {
    const tags : JSDocTag[] = getJSDocTags(node, tagName);

    return !(!tags || !tags.length);
}


// -----------------------------------------
// Tag Comment(s)
// -----------------------------------------

export function getJSDocTagComment(node: Node, tagName: ((tag: JSDocTag) => boolean) | string) : undefined | string {
    const tags : JSDocTag[] = getJSDocTags(node, tagName);

    if (!tags || !tags.length || typeof tags[0].comment !== 'string') {
        return undefined;
    }
    return tags[0].comment;
}

// -----------------------------------------
// Tag Names
// -----------------------------------------

export function getJSDocTagNames(node: Node, requireTagName = false) : string[] {
    let tags: JSDocTag[];

    if (node.kind === SyntaxKind.Parameter) {
        const parameterName = ((node as any).name as Identifier).text;
        tags = getJSDocTags(node.parent as any, tag => {
            if (isJSDocParameterTag(tag)) {
                return false;
            } else if (tag.comment === undefined) {
                throw new ResolverError(`Orphan tag: @${String(tag.tagName.text || tag.tagName.escapedText)} should have a parameter name follows with.`);
            }
            return typeof tag.comment === 'string' ? tag.comment.startsWith(parameterName) : false;
        });
    } else {
        tags = getJSDocTags(node as any, tag => {
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
