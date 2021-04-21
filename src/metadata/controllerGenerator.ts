import {ClassDeclaration, MethodDeclaration, SyntaxKind} from 'typescript';
import { getDecoratorTextValue, isDecorator } from '../utils/decoratorUtils';
import { normalizePath } from '../utils/pathUtils';
import { EndpointGenerator } from './endpointGenerator';
import {Controller, MetadataGenerator, Method} from './metadataGenerator';
import { MethodGenerator } from './methodGenerator';

export class ControllerGenerator extends EndpointGenerator<ClassDeclaration> {
    private path: string | undefined;
    private genMethods: Set<string> = new Set<string>();

    constructor(node: ClassDeclaration, private readonly current: MetadataGenerator) {
        super(node, 'controllers');

        this.generatePath();
    }

    private generatePath() {
        const values : Array<string> = [
            getDecoratorTextValue(this.node, decorator => decorator.text === 'Path' || decorator.text === 'Controller')
        ];

        const httpMethod : string | undefined = getDecoratorTextValue(this.node, decorator => ['Get','Post','Put','All','Delete','Patch','Options','Head'].indexOf(decorator.text) !== -1);
        if(typeof httpMethod !== 'undefined') {
            values.push(httpMethod);
        }

        this.path = normalizePath(values.join('/'));
    }

    public isValid() {
        return !!this.path || this.path === '';
    }

    public generate(): Controller {
        if (!this.node.parent) { throw new Error('Controller node doesn\'t have a valid parent source file.'); }
        if (!this.node.name) { throw new Error('Controller node doesn\'t have a valid name.'); }

        const sourceFile = this.node.parent.getSourceFile();
        this.debugger('Generating Metadata for controller %s', this.getCurrentLocation());
        this.debugger('Controller path: %s', this.path);

        const controllerMetadata = {
            consumes: this.getDecoratorValues('Consumes'),
            location: sourceFile.fileName,
            methods: this.buildMethods(),
            name: this.getCurrentLocation(),
            path: this.path || '',
            produces: (this.getDecoratorValues('Produces') ? this.getDecoratorValues('Produces') : this.getDecoratorValues('Accept')),
            responses: this.getResponses(),
            security: this.getSecurity(),
            tags: this.getDecoratorValues('Tags'),
        };
        this.debugger('Generated Metadata for controller %s: %j', this.getCurrentLocation(), controllerMetadata);
        return controllerMetadata;
    }

    protected getCurrentLocation(): string {
        return (this.node as ClassDeclaration).name.text;
    }

    private buildMethods() : Array<Method> {
        return this.node.members
            .filter((method: { kind: unknown; }) => (method.kind === SyntaxKind.MethodDeclaration))
            .filter((method: MethodDeclaration) => !isDecorator(method, decorator => 'Hidden' === decorator.text))
            .map((method: MethodDeclaration) => new MethodGenerator(method, this.current,this.path || ''))
            .filter((generator: MethodGenerator) => {
                if (generator.isValid() && !this.genMethods.has(generator.getMethodName())) {
                    this.genMethods.add(generator.getMethodName());
                    return true;
                }
                return false;
            })
            .map((generator: MethodGenerator) => generator.generate());
    }
}
