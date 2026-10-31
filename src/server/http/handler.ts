import "server-only";

import { logger } from "@/server/logger";
import { REQUEST_ID_HEADER, resolveRequestId } from "@/server/security/request-id";

import { errorBody, toAppError } from "./errors";

type RouteContext = { params: Promise<Record<string, string | string[]>> };

export interface HandlerContext {
  request: Request;
  requestId: string;
  params: Record<string, string | string[]>;
}

/**
 * Wraps every API route handler: assigns the request id, logs one line per
 * request, converts thrown errors to the documented error shape, and marks
 * responses as uncacheable unless the handler says otherwise.
 */
export function apiHandler(handler: (ctx: HandlerContext) => Promise<Response>) {
  return async (request: Request, context?: RouteContext): Promise<Response> => {
    const started = performance.now();
    const requestId = resolveRequestId(request.headers.get(REQUEST_ID_HEADER));
    const { pathname } = new URL(request.url);
    let response: Response;

    try {
      const params = context ? await context.params : {};
      response = await handler({ request, requestId, params });
    } catch (thrown) {
      const error = toAppError(thrown);
      if (error.status >= 500) {
        logger.error({ err: thrown, requestId, path: pathname }, "request failed");
      }
      response = Response.json(errorBody(error, requestId), {
        status: error.status,
        headers: error.headers,
      });
    }

    response.headers.set(REQUEST_ID_HEADER, requestId);
    if (!response.headers.has("cache-control")) {
      response.headers.set("cache-control", "no-store");
    }
    logger.info(
      {
        requestId,
        method: request.method,
        path: pathname,
        status: response.status,
        ms: Math.round(performance.now() - started),
      },
      "request",
    );
    return response;
  };
}
