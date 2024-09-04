export function constructHeaders(url: string, headers: any = {}, _refererPath?: string): any {
    return {
        ...headers,
        referer: `${url}/`
    }
}
