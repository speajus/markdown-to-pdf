
export const DEFAULTS = {
} as {
    renderImage: (basePath: string) => (imageUrl: string) => Promise<Buffer>;
}