import { sailShapeContent } from "@/data/sail-shape";
import { foundationGuides } from "@/data/foundation-guide";
import { foundationMiniTasks } from "@/data/foundation-mini-tasks";
import { routeMetadata } from "@/lib/product/route-metadata";
import FoundationClient from "./FoundationClient";

export const generateMetadata = routeMetadata("start");

/** Lesson copy is serializable content, not executable client JavaScript. */
export default function StartHerePage() {
  return <FoundationClient guides={foundationGuides} shapeCopy={sailShapeContent} miniTasks={foundationMiniTasks} />;
}
