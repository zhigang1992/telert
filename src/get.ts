export function get(obj: any, path: string): any {
  const keys = path.split(/[.\[\]]+/).filter(Boolean);
  for (let key of keys) {
    if (obj == null || typeof obj !== 'object') {
      return undefined;
    }
    obj = obj[key];
  }
  return obj;
}
