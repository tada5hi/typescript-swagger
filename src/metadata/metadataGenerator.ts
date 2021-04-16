import {sync} from 'glob';
import {castArray} from 'lodash';
import {
    ClassDeclaration,
    CompilerOptions,
    createProgram,
    forEachChild,
    InterfaceDeclaration,
    Node,
    Program,
    SyntaxKind,
    TypeChecker
} from 'typescript';
import {useDebugger} from "../debug";
import {isDecorator} from '../utils/decoratorUtils';
import {ControllerGenerator} from './controllerGenerator';
import {ResolverType} from "./resolver/type";

const M = require("minimatch");

export class MetadataGenerator {
    public static current: MetadataGenerator;
    public readonly nodes = new Array<Node>();
    public readonly typeChecker: TypeChecker;
    private readonly program: Program;
    private referenceTypes: { [typeName: string]: ResolverType.ReferenceType} = {};
    private circularDependencyResolvers = new Array<(referenceTypes: { [typeName: string]: ResolverType.ReferenceType}) => void>();
    private debugger = useDebugger();

    constructor(entryFile: string | Array<string>, compilerOptions: CompilerOptions, private readonly  ignorePaths?: Array<string>) {
        const sourceFiles = this.getSourceFiles(entryFile);
        this.debugger('Starting Metadata Generator');
        this.debugger('Source files: %j ', sourceFiles);
        this.debugger('Compiler Options: %j ', compilerOptions);
        this.program = createProgram(sourceFiles, compilerOptions);
        this.typeChecker = this.program.getTypeChecker();
        MetadataGenerator.current = this;
    }

    public generate(): Metadata {
        this.program.getSourceFiles().forEach((sf: any) => {
            if (this.ignorePaths && this.ignorePaths.length) {
                for (const path of this.ignorePaths) {
                    if(
                        !sf.fileName.includes('node_modules/typescript-rest/') &&
                        !sf.fileName.includes('node_modules/@decorators/express') &&
                        M(sf.fileName, path)
                    ) {
                        return;
                    }
                }
            }

            forEachChild(sf, (node: any) => {
                this.nodes.push(node);
            });
        });

        this.debugger('Building Metadata for controllers Generator');
        const controllers = this.buildControllers();

        this.debugger('Handling circular references');
        this.circularDependencyResolvers.forEach(c => c(this.referenceTypes));

        return {
            controllers: controllers,
            referenceTypes: this.referenceTypes
        };
    }

    public TypeChecker() {
        return this.typeChecker;
    }

    public addReferenceType(referenceType: ResolverType.ReferenceType) {
        this.referenceTypes[referenceType.typeName] = referenceType;
    }

    public getReferenceType(typeName: string) {
        return this.referenceTypes[typeName];
    }

    public onFinish(callback: (referenceTypes: { [typeName: string]: ResolverType.ReferenceType}) => void) {
        this.circularDependencyResolvers.push(callback);
    }

    public getClassDeclaration(className: string) {
        const found = this.nodes
            .filter(node => {
                const classDeclaration = (node as ClassDeclaration);
                return (node.kind === SyntaxKind.ClassDeclaration && classDeclaration.name && classDeclaration.name.text === className);
            });
        if (found && found.length) {
            return found[0];
        }
        return undefined;
    }

    public getInterfaceDeclaration(className: string) {
        const found = this.nodes
            .filter(node => {
                const interfaceDeclaration = (node as InterfaceDeclaration);
                return (node.kind === SyntaxKind.InterfaceDeclaration && interfaceDeclaration.name && interfaceDeclaration.name.text === className);
            });
        if (found && found.length) {
            return found[0];
        }
        return undefined;
    }

    private getSourceFiles(sourceFiles: string | Array<string>) {
        this.debugger('Getting source files from expressions');
        this.debugger('Source file patterns: %j ', sourceFiles);
        const sourceFilesExpressions = castArray(sourceFiles);
        const result: Set<string> = new Set<string>();
        const options = { cwd: process.cwd() };
        sourceFilesExpressions.forEach(pattern => {
            this.debugger('Searching pattern: %s with options: %j', pattern, options);
            const matches = sync(pattern, options);
            matches.forEach(file => {result.add(file); });
        });

        return Array.from(result);
    }

    private buildControllers() {
        return this.nodes
            .filter(node => node.kind === SyntaxKind.ClassDeclaration)
            .filter(node => !isDecorator(node, decorator => 'Hidden' === decorator.text))
            .filter(node => isDecorator(node, decorator => decorator.text === 'Path' || decorator.text === 'Controller'))
            .map((classDeclaration: ClassDeclaration) => new ControllerGenerator(classDeclaration))
            .filter(generator => generator.isValid())
            .map(generator => generator.generate());
    }
}

export interface Metadata {
    controllers: Array<Controller>;
    referenceTypes: { [typeName: string]: ResolverType.ReferenceType};
}

export interface Controller {
    location: string;
    methods: Array<Method>;
    name: string;
    path: string;
    consumes: Array<string>;
    produces: Array<string>;
    responses: Array<ResponseType>;
    tags: Array<string>;
    security?: Array<Security>;
}

export interface Method {
    deprecated?: boolean;
    description: string;
    method: string;
    name: string;
    parameters: Array<Parameter>;
    path: string;
    type: ResolverType.BaseType;
    tags: Array<string>;
    responses: Array<ResponseType>;
    security?: Array<Security>;
    summary?: string;
    consumes: Array<string>;
    produces: Array<string>;
}

export interface Parameter {
    parameterName: string;
    description: string;
    in: string;
    name: string;
    required: boolean;
    type: ResolverType.BaseType;
    collectionFormat?: boolean;
    allowEmptyValue?: boolean;
    default?: any;
    maxItems?: number;
    minItems?: number;
}

export interface Security {
    name: string;
    scopes?: Array<string>;
}

export interface ResponseType {
    description: string;
    status: string;
    schema?: ResolverType.BaseType;
    examples?: any;
}

export interface Property {
    description: string;
    name: string;
    type: ResolverType.BaseType;
    required: boolean;
}

export interface ResponseData {
    status: string;
    type: ResolverType.BaseType;
}
