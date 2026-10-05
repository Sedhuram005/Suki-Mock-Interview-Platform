import type { Metadata } from "next";
import DataDetective from "@/components/DataDetective";

export const metadata: Metadata = {
  title: "Data Detective | Suki Software Solutions",
  description: "Explore CSV data with an AI analyst, Python sandbox, charts, and a downloadable findings report.",
};

export default function DataDetectivePage() {
  return <DataDetective />;
}
