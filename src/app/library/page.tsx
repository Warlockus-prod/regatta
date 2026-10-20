import { redirect } from "next/navigation";

// Preserve bookmarks without maintaining two competing all-sections catalogs.
export default function Page() { redirect("/menu"); }
