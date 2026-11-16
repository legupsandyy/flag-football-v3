import { prisma } from "@/lib/db";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="px-5 py-10 max-w-sm mx-auto">
      <h1 className="font-display text-xl mb-1">Who&apos;s picking?</h1>
      <p className="text-black/40 text-sm mb-6">
        Select your name to enter picks. First time in this league? Ask the commissioner to add you.
      </p>
      <LoginForm users={users.map((u) => ({ id: u.id, name: u.name }))} />
    </div>
  );
}
