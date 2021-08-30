import {findBuildInIDRepresentation, isBuildInIncluded} from "../../../../src/decorator/build-in";
import {Decorator} from "../../../../src/decorator/type";

describe('index.ts', () => {
    it('isBuildInIncluded', () => {
        expect(isBuildInIncluded(undefined)).toBeTruthy();
        expect(isBuildInIncluded({useBuildIn: "CLASS_PATH"}, 'CLASS_PATH')).toBeTruthy();
        expect(isBuildInIncluded({useBuildIn: ["CLASS_PATH"]}, 'CLASS_PATH')).toBeTruthy();
        expect(isBuildInIncluded({useBuildIn: ({"CLASS_PATH": true} as Record<Decorator.Type, boolean>)}, 'CLASS_PATH')).toBeTruthy();
        expect(isBuildInIncluded({useBuildIn: null})).toBeTruthy();
    });

    it('isBuildInIncluded', () => {
        expect(findBuildInIDRepresentation('CLASS_PATH', {useBuildIn: false})).toBeFalsy();

        const responseDescription = findBuildInIDRepresentation('RESPONSE_DESCRIPTION', {useBuildIn: true});
        expect(responseDescription).toBeDefined();
        expect(responseDescription).toHaveProperty('name', 'ResponseDescription');

        expect(findBuildInIDRepresentation('CLASS_PATH', {useBuildIn: 'RESPONSE_DESCRIPTION'})).toBeUndefined();
        expect(findBuildInIDRepresentation('CLASS_PATH', {useBuildIn: ["CLASS_PATH"]})).toBeUndefined();
        expect(findBuildInIDRepresentation('CLASS_PATH', {useBuildIn: ({"CLASS_PATH": true} as Record<Decorator.Type, boolean>)}, )).toBeUndefined();
        expect(findBuildInIDRepresentation('CLASS_PATH', {useBuildIn: ({"CLASS_PATH": false} as Record<Decorator.Type, boolean>)}, )).toBeUndefined();
    });
});
