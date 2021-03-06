import {ClassDeclaration, MethodDeclaration, SyntaxKind} from 'typescript';
import {Decorator} from "../decorator/type";
import { EndpointGenerator } from './endpointGenerator';
import {Controller, MetadataGenerator, Method} from './metadataGenerator';
import { MethodGenerator } from './methodGenerator';

export class ControllerGenerator extends EndpointGenerator<ClassDeclaration> {
    private genMethods: Set<string> = new Set<string>();

    // --------------------------------------------------------------------

    constructor(node: ClassDeclaration, current: MetadataGenerator) {
        super(node, current);

        this.generatePath('CLASS_PATH');
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

        const controllerMetadata : Controller = {
            consumes: this.getConsumes(),
            location: sourceFile.fileName,
            methods: this.buildMethods(),
            name: this.getCurrentLocation(),
            path: this.path || '',
            produces: this.getProduces(),
            responses: this.getResponses(),
            security: this.getSecurity(),
            tags: this.getTags(),
        };

        this.debugger('Generated Metadata for controller %s: %j', this.getCurrentLocation(), controllerMetadata);
        return controllerMetadata;
    }

    protected getCurrentLocation(): string {
        return (this.node as ClassDeclaration).name.text;
    }

    private buildMethods() : Array<Method> {
        const handler = Decorator.getRepresentationHandler('SWAGGER_HIDDEN', this.current.decoratorMap);

        return this.node.members
            .filter((method: { kind: unknown; }) => (method.kind === SyntaxKind.MethodDeclaration))
            .filter((method: MethodDeclaration) => !handler.isPresentOnNode(method))
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
