"use client";

import { useRouter } from "next/navigation";

export default function NavLogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={logout} className="text-black/60 dark:text-white/60 hover:underline">
      Sign out
    </button>
  );
}
