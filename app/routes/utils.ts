export function formatSize(byte: number): string {
    if (byte === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(byte) / Math.log(k));
    
    return parseFloat((byte / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const generateUUID= () => crypto.randomUUID();