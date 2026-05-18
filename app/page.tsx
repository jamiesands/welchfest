"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const id = localStorage.getItem("welchfest:guest_id");
    router.replace(id ? "/feed" : "/join");
  }, [router]);
  return <main className="min-h-dvh bg-paper" />;
}
