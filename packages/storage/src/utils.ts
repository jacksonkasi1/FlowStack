export const DANGEROUS_PATTERNS = /\.\.|^\/|[\x00-\x1f]/;

export function isValidPath(path: string): boolean {
    if (!path) return false;
    return !DANGEROUS_PATTERNS.test(path);
}

export function isValidFileName(fileName: string): boolean {
    if (!fileName) return false;
    // File names shouldn't contain path separators or dangerous chars
    if (/\.\.|[\/\\]|[\x00-\x1f]/.test(fileName)) return false;
    if (fileName.length > 255) return false;
    return true;
}
