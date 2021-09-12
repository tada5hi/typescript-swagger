import {sync} from 'glob';
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
    SourceFile,
    SyntaxKind,
    TypeChecker
} from 'typescript';
import {Config} from "../config/type";
import {useDebugger} from "../debug";
import {DecoratorMapper} from "../decorator/mapper";
import {MetadataCache} from "./cache/index";
import {ControllerGenerator} from './controller';
import {TypeNodeResolver} from "./resolver";
import {Resolver} from "./resolver/type";
import {Metadata} from "./type";

const minimatch = require("minimatch");

export class MetadataGenerator {
    public readonly nodes = new Array<Node>();
    public readonly typeChecker: TypeChecker;

    public readonly decoratorMapper: DecoratorMapper;

    public readonly config: Config;

    private readonly program: Program;

    private cache : MetadataCache;
    private controllers: Metadata.Controller[];
    private referenceTypes: Resolver.ReferenceTypes = {};

    private circularDependencyResolvers = new Array<Resolver.DependencyResolver>();

    private debugger = useDebugger();

    // -------------------------------------------------------------------------

    constructor(
        config: Config,
        compilerOptions: CompilerOptions
    ) {
        this.config = config;

        this.cache = new MetadataCache(config.metadata);
        this.decoratorMapper = new DecoratorMapper(config.decorator);

        TypeNodeResolver.clearCache();

        const sourceFiles = this.scanSourceFiles(config.metadata.entryFile);
        this.program = createProgram(sourceFiles, compilerOptions);
        this.typeChecker = this.program.getTypeChecker();
    }

    // -------------------------------------------------------------------------

    public generate(): Metadata.Output {
        const sourceFileSize : number = this.buildNodesFromSourceFiles();

        let cache = this.cache.get(sourceFileSize);

        if(!cache) {
            this.debugger('Building Metadata for controllers Generator');
            this.buildControllers();

            this.debugger('Handling circular references');
            this.circularDependencyResolvers.forEach(resolve => resolve(this.referenceTypes));

            cache = {
                controllers: this.controllers,
                referenceTypes: this.referenceTypes,
                sourceFileSize: sourceFileSize
            };

            this.cache.save(cache);
        }

        return {
            controllers: cache.controllers,
            referenceTypes: cache.referenceTypes
        };
    }

    protected buildNodesFromSourceFiles() : number {
        let endSize : number = 0;

        this.program.getSourceFiles().forEach((sf: SourceFile) => {
            const isIgnored : boolean = this.isIgnoredPath(sf.fileName);
            if(isIgnored) {
                return;
            }

            endSize += sf.end;

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

        return endSize;
    }

    // -------------------------------------------------------------------------

    /**
     * Check if the source file path is in the ignored path list.
     *
     * @param filePath
     * @protected
     */
    protected isIgnoredPath(filePath: string) : boolean {
        if(typeof this.config.metadata.ignore === 'undefined') {
            return false;
        }

        return this.config.metadata.ignore.some(item => minimatch(filePath, item));
    }

    // -------------------------------------------------------------------------

    public isExportedNode(node: Node) {
        return true;
    }

    // -------------------------------------------------------------------------

    public addReferenceType(referenceType: Resolver.ReferenceType) {
        if (!referenceType.refName) {
            return;
        }

        this.referenceTypes[referenceType.refName] = referenceType;
    }

    public getReferenceType(refName: string) {
        return this.referenceTypes[refName];
    }

    public registerDependencyResolver(callback: Resolver.DependencyResolver) {
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

    private scanSourceFiles(sourceFiles: string | string[]) {
        this.debugger('Getting source files from expressions');
        this.debugger('Source file patterns: %j ', sourceFiles);
        const sourceFilesExpressions = Array.isArray(sourceFiles) ? sourceFiles : [sourceFiles];
        const result: Set<string> = new Set<string>();
        const options = { cwd: process.cwd() };
        sourceFilesExpressions.forEach(pattern => {
            this.debugger('Searching pattern: %s with options: %j', pattern, options);
            const matches = sync(pattern, options);
            matches.forEach(file => {result.add(file); });
        });

        return Array.from(result);
    }

    private buildControllers() : void {
        this.controllers = this.nodes
            .filter(node => node.kind === SyntaxKind.ClassDeclaration)
            .filter(node => {
                const isHidden = this.decoratorMapper.match('HIDDEN', node);

                return typeof isHidden === 'undefined';
            })
            .filter(node => typeof this.decoratorMapper.match('CLASS_PATH', node) !== 'undefined')
            .map((classDeclaration: ClassDeclaration) => new ControllerGenerator(classDeclaration, this))
            .filter(generator => generator.isValid())
            .map(generator => generator.generate());
    }
}
