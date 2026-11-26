import ProductMenu from "@/components/product/ProductMenu";
import { routeMetadata } from "@/lib/product/route-metadata";

export const generateMetadata = routeMetadata("menu");

export default function Page() { return <ProductMenu />; }
