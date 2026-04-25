import type { Metadata } from "next";
import StoreProfilePageClient from "./page-client";
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
    .from("stores")
    .select("id, name, city, state, description, active")
    .eq("id", id)
    .maybeSingle();

  if (!data || !data.active) {
    return buildMetadata({
      title: "Store Not Found",
      description: "Browse cigar reviews, ratings, brands, and nearby inventory on CigarDex.",
      path: `/store/${id}`,
    });
  }

  const storeName = cleanText(data.name);
  const location = [cleanText(data.city), cleanText(data.state)].filter(Boolean).join(", ");
  const description =
    truncateText(data.description, 155) ||
    `View ${storeName}${location ? ` in ${location}` : ""} on CigarDex, including carried brands, reviews, and store details.`;

  return buildMetadata({
    title: storeName,
    description,
    path: `/store/${id}`,
  });
}

export default function StoreProfilePage() {
  return <StoreProfilePageClient />;
}
