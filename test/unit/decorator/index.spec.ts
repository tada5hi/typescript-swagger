import {
    IsDouble,
    IsFloat,
    IsInt, IsLong,
    RequestConsumes,
    ResponseDescription,
    ResponseExample,
    ResponseProduces,
    SwaggerHidden,
    SwaggerTags
} from "../../../src";

describe('index.ts', () => {
    it('check response description decorator', () => {
        expect(ResponseDescription('')).toBeDefined();
        expect(ResponseDescription('')()).toBeUndefined();
    });

    it('check response example decorator', () => {
        expect(ResponseExample('')).toBeDefined();
        expect(ResponseExample('')()).toBeUndefined();
    });

    it('check swagger tags decorator', () => {
        expect(SwaggerTags('')).toBeDefined();
        expect(SwaggerTags('')()).toBeUndefined();
    });

    it('check request consumes decorator', () => {
        expect(RequestConsumes('')).toBeDefined();
        expect(RequestConsumes('')()).toBeUndefined();
    });

    it('check response produces decorator', () => {
        expect(ResponseProduces('')).toBeDefined();
        expect(ResponseProduces('')()).toBeUndefined();
    });

    it('check swagger hidden decorator', () => {
        expect(SwaggerHidden()).toBeDefined();
        expect(SwaggerHidden()()).toBeUndefined();
    });

    it('check is int decorator', () => {
        expect(IsInt('', '')).toBeUndefined();
    });

    it('check is long decorator', () => {
        expect(IsLong('', '')).toBeUndefined();
    });

    it('check is float decorator', () => {
        expect(IsFloat('', '')).toBeUndefined();
    });

    it('check is double decorator', () => {
        expect(IsDouble('', '')).toBeUndefined();
    });
});
