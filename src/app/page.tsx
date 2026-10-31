import { Sparkles } from "lucide-react";

import { EmptyState } from "@/components/ui/display";
import { Container } from "@/components/ui/layout";

/**
 * Home page. Its sections (introduction, featured projects, recent journal
 * entries, ...) arrive with the content they display in Phase 5; until anything
 * is published, visitors see an honest empty state instead of placeholder content.
 */
export default function HomePage() {
  return (
    <Container className="flex flex-1 items-center py-16 md:py-24">
      <EmptyState
        className="w-full"
        icon={<Sparkles />}
        title="Nothing is published yet"
        description="This site is being set up. Content will appear here once it is published."
      />
    </Container>
  );
}
