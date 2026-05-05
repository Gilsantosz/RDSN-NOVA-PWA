export function createPageUrl(pageName: string) {
    return '/' + pageName.replace(/ /g, '-');
}

export function normalizeYear(year: string | number | null | undefined): string {
    if (year === null || year === undefined || year === '') return '';
    let yStr = year.toString().trim();
    if (yStr.length === 4) return yStr.slice(-2);
    if (yStr.length === 2) return yStr;
    return yStr;
}