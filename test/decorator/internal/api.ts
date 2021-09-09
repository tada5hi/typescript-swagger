import {GET, Path, POST} from "typescript-rest";
import {RequestConsumes, ResponseDescription, ResponseExample, ResponseProduces, SwaggerTags} from "../../../src";

interface Address {
    street: string;
}

interface Person {
    /**
     * Id of Person
     * @example 1
     * @isFloat
     */
    id: number;
    name: string;
    address?: Address;
}

@Path('mypath')
@SwaggerTags('My Services')
export class MyService {
    @ResponseDescription<string>('default', 'Error')
    @ResponseDescription<string>(400, 'The request format was incorrect.')
    @ResponseDescription<string>(500, 'There was an unexpected error.')
    @GET
    public test(): string {
        return 'OK';
    }

    /**
     * a a
     *
     * @param body
     */
    @POST
    @ResponseExample<Person[]>([{
        id: 1,
        name: 'Joe'
    }])
    @RequestConsumes('application/json', 'text/html')
    @ResponseProduces('application/json')
    public testPostString(body: string): Person[] {
        return [];
    }
}
