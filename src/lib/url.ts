/** Prefixes a root-relative path with the base path, e.g. /christ-klep/ on <user>.github.io. */
export const url = (path: string) => import.meta.env.BASE_URL.replace(/\/$/, "") + path;
