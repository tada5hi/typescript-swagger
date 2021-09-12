export type SwaggerDocumentationFormatType = 'yaml' | 'json';

export interface SwaggerDocumentationFormatData {
    path: string;
    name: string;
    content?: string;
}
