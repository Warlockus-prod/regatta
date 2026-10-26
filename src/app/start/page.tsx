import { sailShapeContent } from "@/data/sail-shape";
import { foundationGuides } from "@/data/foundation-guide";
import FoundationClient from "./FoundationClient";

/** Lesson copy is serializable content, not executable client JavaScript. */
export default function StartHerePage() {
  return <FoundationClient guides={foundationGuides} shapeCopy={sailShapeContent} />;
}
