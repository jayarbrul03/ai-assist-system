import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppSidebarLoader } from "@/components/shared/app-sidebar-loader";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-1 min-h-screen">
      <AppSidebarLoader />
      <main className="flex-1 min-w-0 bg-neutral-50">{children}</main>
    </div>
  );
}
