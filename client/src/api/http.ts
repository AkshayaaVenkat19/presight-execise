export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function requestJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, {
      ...options,
      credentials: "same-origin",
      headers: { Accept: "application/json", ...options.headers },
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError("Unable to connect. Please try again.", 0);
  }
  if (!response.ok) {
    let message = "Something went wrong. Please try again.";
    try {
      const body = await response.json();
      if (typeof body.error?.message === "string") message = body.error.message;
    } catch (error) {
      if (options.signal?.aborted) throw error;
    }
    if (response.status === 401 && !path.startsWith("auth/")) {
      window.dispatchEvent(new Event("session-expired"));
    }
    throw new ApiError(message, response.status);
  }
  return response.json() as Promise<T>;
}
