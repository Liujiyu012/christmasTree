export async function api<T = Record<string, unknown>>(path: string, data?: Record<string, unknown>): Promise<T> {
  const response = await fetch(path, {cache:"no-store", ...(data ? {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data)} : {})});
  const result = await response.json() as T & {error?:string};
  if (!response.ok) throw Object.assign(new Error(result.error || "暂时没能送达，请再试一次。"), {status:response.status});
  return result;
}
