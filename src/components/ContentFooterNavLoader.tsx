'use client';

import dynamic from "next/dynamic";
import type { ContentFooterNavPage } from "./ContentFooterNav";

// One shared split point keeps the same server-rendered navigation without
// repeating the complete seven-language footer in every content route.
const ContentFooterNavLoader = dynamic<{ page: ContentFooterNavPage }>(() => import("./ContentFooterNav"));
export default ContentFooterNavLoader;
