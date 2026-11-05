import ProductHub from "@/components/product/ProductHub";
import { routeMetadata } from "@/lib/product/route-metadata";

export const generateMetadata = routeMetadata("race");

export default function Page() { return <ProductHub section="race" />; }
