import {sync} from 'glob';
import {castArray} from 'lodash';
import {
    ClassDeclaration,
    CompilerOptions,
    createProgram,
    forEachChild,
    InterfaceDeclaration,
    isModuleBlock,
    isModuleDeclaration,
    Node,
    NodeFlags,
    Program,
    SyntaxKind,
    TypeChecker
} from 'typescript';
import {useDebugger} from "../debug";
import {Decorator} from "../decorator/type";
import {isDecorator} from '../utils/decoratorUtils';
import {ControllerGenerator} from './controllerGenerator';
import {TypeNodeResolver} from "./resolver";
import {Resolver} from "./resolver/type";

const M = require("minimatch");

export class MetadataGenerator {
    public readonly nodes = new Array<Node>();
    public readonly typeChecker: TypeChecker;
    private readonly program: Program;
    private referenceTypes: { [typeName: string]: Resolver.ReferenceType} = {};
    private circularDependencyResolvers = new Array<(referenceTypes: { [refName: string]: Resolver.ReferenceType}) => void>();
    private debugger = useDebugger();

    constructor(
        entryFile: string | Array<string>,
        compilerOptions: CompilerOptions,
        private readonly  ignorePaths?: Array<string>,
        public decoratorMap?: Decorator.Representation
    ) {
        TypeNodeResolver.clearCache();

        const sourceFiles = this.getSourceFiles(entryFile);
        this.debugger('Starting Metadata Generator');
        this.debugger('Source files: %j ', sourceFiles);
        this.debugger('Compiler Options: %j ', compilerOptions);

        this.program = createProgram(sourceFiles, compilerOptions);
        this.typeChecker = this.program.getTypeChecker();
    }

    public generate(): Metadata {
        this.program.getSourceFiles().forEach((sf: any) => {
            if (this.ignorePaths && this.ignorePaths.length) {
                for (const path of this.ignorePaths) {
                    if(
                        // sf.fileName.includes('node_modules/typescript-rest/') ||
                        // sf.fileName.includes('node_modules/@decorators/express') ||
                        M(sf.fileName, path)
                    ) {
                        return;
                    }
                }
            }

            forEachChild(sf, (node: any) => {

                if (isModuleDeclaration(node)) {
                    /**
                     * For some reason unknown to me, TS resolves both `declare module` and `namespace` to
                     * the same kind (`ModuleDeclaration`). In order to figure out whether it's one or the other,
                     * we check the node flags. They tell us whether it is a namespace or not.
                     */
                    // tslint:disable-next-line:no-bitwise
                    if ((node.flags & NodeFlags.Namespace) === 0 && node.body && isModuleBlock(node.body)) {
                        node.body.statements.forEach(statement => {
                            this.nodes.push(statement);
                        });
                        return;
                    }
                }


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

    public isExportedNode(node: Node) {
        return true;
    }

    public addReferenceType(referenceType: Resolver.ReferenceType) {
        if (!referenceType.refName) {
            return;
        }

        this.referenceTypes[referenceType.refName] = referenceType;
    }

    public getReferenceType(refName: string) {
        return this.referenceTypes[refName];
    }

    public onFinish(callback: (referenceTypes: { [refName: string]: Resolver.ReferenceType}) => void) {
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
        const hiddenDecoratorKey : Array<string> = Decorator.getKeyRepresentations('HIDDEN', this.decoratorMap);
        const pathDecoratorKey : Array<string> = Decorator.getKeyRepresentations('CLASS_PATH', this.decoratorMap);

        return this.nodes
            .filter(node => node.kind === SyntaxKind.ClassDeclaration)
            .filter(node => !isDecorator(node, decorator => hiddenDecoratorKey.indexOf(decorator.text) !== -1))
            .filter(node => isDecorator(node, decorator => pathDecoratorKey.indexOf(decorator.text) !== -1))
            .map((classDeclaration: ClassDeclaration) => new ControllerGenerator(classDeclaration, this))
            .filter(generator => generator.isValid())
            .map(generator => generator.generate());
    }
}

export interface Metadata {
    controllers: Array<Controller>;
    referenceTypes: { [typeName: string]: Resolver.ReferenceType};
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
    type: Resolver.BaseType;
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
    type: Resolver.BaseType;
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
    schema?: Resolver.BaseType;
    examples?: any;
}

export interface Property {
    default?: any;
    format?: string;
    example?: unknown;
    validators: Record<string, { value?: any, message?: string }>;
    description?: string;
    name: string;
    type: Resolver.Type;
    required: boolean;
}

export interface ResponseData {
    status: string;
    type: Resolver.BaseType;
}
