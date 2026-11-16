import JoinForm from "@/components/JoinForm";

export default function LoginPage() {
  return (
    <div className="px-5 py-10 max-w-sm mx-auto">
      <div className="font-mono text-xs text-black/40 mb-1">postseason / join</div>
      <h1 className="font-display text-xl mb-1">Join the tournament</h1>
      <p className="text-black/50 text-sm mb-6">
        Enter the group password and your name. Already joined? Use the same name to sign back in.
      </p>
      <JoinForm />
    </div>
  );
}
