import type { Metadata } from "next";
import CigarDetailPageClient from "./page-client";
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
    .from("cigars")
    .select("id, name, line, description, brand_accounts(name)")
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    return buildMetadata({
      title: "Cigar Not Found",
      description: "Browse cigar reviews, ratings, brands, and nearby inventory on CigarDex.",
      path: `/cigar/${id}`,
    });
  }

  const brandAccount = Array.isArray(data.brand_accounts)
    ? data.brand_accounts[0]
    : data.brand_accounts;
  const brandName = cleanText(brandAccount?.name);
  const cigarName = cleanText(data.name);
  const lineName = cleanText(data.line);
  const titleBase = [brandName, lineName, cigarName].filter(Boolean).join(" ");
  const description =
    truncateText(data.description, 155) ||
    `Read reviews, ratings, tasting notes, and nearby inventory for ${titleBase} on CigarDex.`;

  return buildMetadata({
    title: titleBase,
    description,
    path: `/cigar/${id}`,
  });
}

export default function CigarDetailPage() {
  return <CigarDetailPageClient />;
}
