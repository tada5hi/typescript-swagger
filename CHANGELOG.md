# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### BREAKING CHANGES

## [0.0.9] - 2021-07-29

- changed build-in decorator representations
    - `@Response` -> `@ResponseDescription`
    - `@Example` -> `@ResponseExample`
    - `@Produces` -> `@ResponseProduces`
    - `@Consumes` -> `@RequestConsumes`
    - `@Tags` ->`@SwaggerTags`
    - `@Hidden` -> `@SwaggerHidden`
- renamed config file `swaggerConfig.json` to `swagger-config.json`
- renamed build command `swaggerGen` to  `swagger-generate`
### Added

- extended `swagger-config.json` (SwaggerConfig) Schema, to support own and third party
decorator representations

- added decorator representation sets for `typescript-rest` & `@decorators/express` library

## [0.0.9] - 2021-04-30

### Added

- support for typescript utility type(s)

### Changed

- resolver logic

[unreleased]: https://github.com/olivierlacan/keep-a-changelog/compare/v0.0.9...HEAD
[0.0.9]: https://github.com/tada5hi/typescript-swagger/releases/tag/v0.0.9
