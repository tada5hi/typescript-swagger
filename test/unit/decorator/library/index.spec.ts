import {findLibraryIDRepresentation, isLibraryIncluded, Library} from "../../../../src/decorator/library";
import {Decorator} from "../../../../src/decorator/type";


describe('index.ts', () => {
    it('isLibraryIncluded', () => {
        expect(isLibraryIncluded('typescript-rest')).toBeFalsy();
        expect(isLibraryIncluded('typescript-rest', {useLibrary: "typescript-rest"}, )).toBeTruthy();
        expect(isLibraryIncluded('typescript-rest', {useLibrary: ["typescript-rest", "@decorators/express"]})).toBeTruthy();
        expect(isLibraryIncluded('typescript-rest', {useLibrary: {"typescript-rest":  ["CLASS_PATH" as Decorator.ID]} as Record<Library, any>})).toBeTruthy();
        expect(isLibraryIncluded('typescript-rest', {useLibrary: {"@decorators/express":  ["CLASS_PATH" as Decorator.ID]} as Record<Library, any>})).toBeFalsy();
        expect(isLibraryIncluded('typescript-rest', {useLibrary: null})).toBeFalsy();
    });

    it('findLibraryIDRepresentation', () => {
        expect(findLibraryIDRepresentation('typescript-rest', 'CLASS_PATH')).toBeDefined();
        expect(findLibraryIDRepresentation('@decorators/express', 'CLASS_PATH')).toBeDefined();

        expect(findLibraryIDRepresentation('typescript-rest', 'SWAGGER_TAGS')).toBeUndefined();
        expect(findLibraryIDRepresentation('@decorators/express', 'SWAGGER_TAGS')).toBeUndefined();

        expect(findLibraryIDRepresentation('typescript-rest', 'CLASS_PATH', {useLibrary: 'typescript-rest'})).toBeDefined();
        expect(findLibraryIDRepresentation('typescript-rest', 'CLASS_PATH', {useLibrary: '@decorators/express'})).toBeUndefined();

        expect(findLibraryIDRepresentation('typescript-rest', 'CLASS_PATH', {useLibrary: {"typescript-rest":  ["CLASS_PATH" as Decorator.ID]} as Record<Library, Array<Decorator.ID>>})).toBeDefined();

        const responseDescription = findLibraryIDRepresentation('typescript-rest','METHOD_PATH', {useLibrary: ['typescript-rest']});
        expect(responseDescription).toBeDefined();
        expect(responseDescription).toHaveProperty('name', 'Path');
        expect(findLibraryIDRepresentation('typescript-rest','METHOD_PATH', {useLibrary: ['@decorators/express']})).toBeUndefined();

        expect(findLibraryIDRepresentation('typescript-rest','CLASS_PATH', {useLibrary: {"@decorators/express": 'RESPONSE_DESCRIPTION'} as Record<Library, Decorator.ID>})).toBeUndefined();
        expect(findLibraryIDRepresentation('typescript-rest','CLASS_PATH', {useLibrary: {"typescript-rest": 'RESPONSE_DESCRIPTION'} as Record<Library, Decorator.ID>})).toBeUndefined();
        expect(findLibraryIDRepresentation('typescript-rest','CLASS_PATH', {useLibrary: {"typescript-rest": 'CLASS_PATH'} as Record<Library, Decorator.ID>})).toBeDefined();

        expect(findLibraryIDRepresentation('typescript-rest','CLASS_PATH', {useLibrary: {"typescript-rest": ['CLASS_PATH']} as Record<Library, Array<Decorator.ID>>})).toBeDefined();
        expect(findLibraryIDRepresentation('typescript-rest','CLASS_PATH', {useLibrary: {"typescript-rest": ['RESPONSE_DESCRIPTION']} as Record<Library, Array<Decorator.ID>>})).toBeUndefined();

        expect(findLibraryIDRepresentation('typescript-rest','CLASS_PATH', {useLibrary: {"typescript-rest": {"CLASS_PATH": true}} as Record<Library, Record<Decorator.ID, boolean>>})).toBeDefined();
        expect(findLibraryIDRepresentation('typescript-rest','CLASS_PATH', {useLibrary: {"typescript-rest": {"CLASS_PATH": false}} as Record<Library, Record<Decorator.ID, boolean>>})).toBeUndefined();
  });
});
