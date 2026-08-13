import { DEMO_AFTERIMAGES } from "@/lib/demo-data";
import { AfterimageDetailClient } from "./AfterimageDetailClient";

export function generateStaticParams() {
  return DEMO_AFTERIMAGES.map((item) => ({ id: item.id }));
}

export default function AfterimageDetailPage() {
  return <AfterimageDetailClient />;
}
