import { redirect } from "next/navigation";

// Super Bowl props were removed. Anyone with an old link goes to the home page.
export default function PropsPage() {
  redirect("/");
}
