export const ok = <T>(data: T) => ({ ok: true, data });
export const fail = (message: string, code = "BAD_REQUEST") => ({ ok: false, error: { message, code }});
