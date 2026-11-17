import JoinForm from "@/components/JoinForm";
import { SITE_NAME } from "@/lib/site";
import Logo from "@/components/Logo";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Logo size={44} />
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wide text-black/40">welcome to</div>
          <div className="font-display text-xl leading-tight">{SITE_NAME}</div>
        </div>
      </div>
      <div className="border border-grid bg-panel p-5">
        <p className="mb-5 text-sm text-black/50">
          Enter the group password and your name. Already joined? Use the same name to sign back in.
        </p>
        <JoinForm />
      </div>
    </div>
  );
}
