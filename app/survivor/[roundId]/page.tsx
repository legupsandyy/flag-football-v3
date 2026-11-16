import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import RosterBuilder from "@/components/RosterBuilder";

export default async function RoundPage({ params }: { params: { roundId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <RosterBuilder roundId={params.roundId} />;
}
