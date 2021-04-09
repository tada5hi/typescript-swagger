import {JSDoc, JSDocTag, Node} from 'typescript';

export function getJSDocDescription(node: Node) {
    const jsDocs = (node as any).jsDoc as Array<JSDoc>;
    if (!jsDocs || !jsDocs.length) { return ''; }

    return jsDocs[0].comment || '';
}

export function getJSDocTag(node: Node, tagName: string) {
    const tags = getJSDocTags(node, tagName);
    if (!tags || !tags.length) {
        return undefined;
    }
    return tags[0].comment;
}

export function isExistJSDocTag(node: Node, tagName: string) {
    const tags = getJSDocTags(node, tagName);
    return !(!tags || !tags.length);
}

function getJSDocTags(node: Node, tagName: string) {
    return getMatchingJSDocTags(node, t => t.tagName.text === tagName);
}

export function getFirstMatchingJSDocTagName(node: Node, isMatching: (t: JSDocTag) => boolean) {
    const tags = getMatchingJSDocTags(node, isMatching);
    if (!tags || !tags.length) { return undefined; }

    return tags[0].tagName.text;
}

function getMatchingJSDocTags(node: Node, isMatching: (t: JSDocTag) => boolean) {
    const jsDocs = (node as any).jsDoc as Array<JSDoc>;
    if (!jsDocs || !jsDocs.length) { return undefined; }

    const jsDoc = jsDocs[0];
    if (!jsDoc.tags) { return undefined; }

    return jsDoc.tags.filter(isMatching);
}
