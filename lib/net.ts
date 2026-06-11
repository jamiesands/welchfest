// Network hardening helpers for patchy venue 4G (HARDENING-AUDIT.md C4).
//
// Supabase queries and storage uploads are awaited all over the app with no
// deadline, so a stalled connection leaves buttons disabled forever with no
// retry path. withTimeout() races a promise against a timer so the UI can
// fail visibly and re-enable. It does not abort the underlying request —
// callers that retry after a timeout should warn the user the first attempt
// may still land (see UploadSheet copy).

export const QUERY_TIMEOUT_MS = 12_000;
export const UPLOAD_TIMEOUT_MS = 90_000;

export class TimeoutError extends Error {
  constructor(label: string) {
    super(label);
    this.name = "TimeoutError";
  }
}

export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number = QUERY_TIMEOUT_MS,
  label = "Request timed out"
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(label)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
