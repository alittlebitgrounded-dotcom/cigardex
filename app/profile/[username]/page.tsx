import type { Metadata } from "next";
import ProfilePageClient from "./page-client";
import {
  buildMetadata,
  cleanText,
  createSupabaseMetadataClient,
} from "@/server/metadata";

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const supabase = createSupabaseMetadataClient();
  const { data } = await supabase
    .from("users")
    .select("id, username, role")
    .eq("username", username)
    .maybeSingle();

  const cleanUsername = cleanText(username);

  if (!data) {
    return buildMetadata({
      title: `${cleanUsername} Profile`,
      description: `View cigar reviews and profile activity for ${cleanUsername} on CigarDex.`,
      path: `/profile/${cleanUsername}`,
    });
  }

  let isReviewer = data.role === "reviewer";

  if (!isReviewer) {
    try {
      const { data: reviewerMembership } = await supabase
        .from("reviewer_publication_members")
        .select("id")
        .eq("user_id", data.id)
        .eq("status", "approved")
        .maybeSingle();

      isReviewer = !!reviewerMembership;
    } catch {
      isReviewer = false;
    }
  }

  const actualUsername = cleanText(data.username) || cleanUsername;
  const roleLabel =
    isReviewer
      ? "reviewer"
      : data.role === "super_admin" || data.role === "moderator"
        ? "community member"
        : "cigar enthusiast";

  return buildMetadata({
    title: `${actualUsername}'s Profile`,
    description: `Read reviews and follow the tasting activity of ${actualUsername}, a ${roleLabel} on CigarDex.`,
    path: `/profile/${actualUsername}`,
  });
}

export default function ProfilePage() {
  return <ProfilePageClient />;
}
