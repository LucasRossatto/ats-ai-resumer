import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";

export interface FakeReply {
  status: number;
  data?: unknown;
}

/** Axios adapter driven by a handler: 2xx resolves, anything else rejects like axios does. */
export function fakeAdapter(
  handler: (config: InternalAxiosRequestConfig) => FakeReply | Promise<FakeReply>,
): AxiosAdapter {
  return async (config) => {
    const { status, data } = await handler(config);
    const response = { status, data, statusText: "", headers: {}, config };
    if (status >= 200 && status < 300) return response;
    throw new AxiosError(
      `Request failed with status code ${status}`,
      AxiosError.ERR_BAD_REQUEST,
      config,
      null,
      response,
    );
  };
}

export const ok = (data: unknown): FakeReply => ({
  status: 200,
  data: { message: "ok", data },
});
