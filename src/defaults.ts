
export type SvgOptions = {
    width?: number;
    height?: number;
}

export const DEFAULTS = {
    
} as {
    renderImage: (basePath: string) => (imageUrl: string) => Promise<Buffer>;
    renderSvg: (svg: string, options?:SvgOptions) => Promise<Buffer>;
}