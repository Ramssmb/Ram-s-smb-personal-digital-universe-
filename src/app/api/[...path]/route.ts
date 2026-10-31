import { AppError } from "@/server/http/errors";
import { apiHandler } from "@/server/http/handler";

// Unknown API paths answer with the JSON error shape instead of the HTML 404 page.
const notFound = apiHandler(async () => {
  throw new AppError("not_found");
});

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
