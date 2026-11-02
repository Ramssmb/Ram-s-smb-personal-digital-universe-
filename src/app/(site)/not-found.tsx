import { NotFoundContent } from "@/components/site/not-found-content";

/** 404 for public pages, inside the site layout so the header and footer stay available. */
export default function SiteNotFound() {
  return <NotFoundContent withSearch />;
}
