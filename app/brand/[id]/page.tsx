import type { Metadata } from "next";
import BrandPageClient from "./page-client";
import {
  buildMetadata,
  cleanText,
  createSupabaseMetadataClient,
  truncateText,
} from "@/server/metadata";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = createSupabaseMetadataClient();
  const { data } = await supabase
    .from("brand_accounts")
    .select("id, name, country_of_origin, about, description")
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    return buildMetadata({
      title: "Brand Not Found",
      description: "Browse cigar reviews, ratings, brands, and nearby inventory on CigarDex.",
      path: `/brand/${id}`,
    });
  }

  const brandName = cleanText(data.name);
  const country = cleanText(data.country_of_origin);
  const description =
    truncateText(data.about || data.description, 155) ||
    `Explore cigars, reviews, and brand details for ${brandName}${country ? ` from ${country}` : ""} on CigarDex.`;

  return buildMetadata({
    title: brandName,
    description,
    path: `/brand/${id}`,
  });
}

export default function BrandPage() {
  return <BrandPageClient />;
}
