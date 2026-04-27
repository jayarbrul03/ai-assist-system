import { getActiveScheme } from "@/lib/scheme";
import { isLeadershipRole } from "@/lib/roles";
import { Sidebar } from "./sidebar";

/**
 * Resolves org role and passes feature flags to the client sidebar.
 */
export async function AppSidebarLoader() {
  const ctx = await getActiveScheme();
  const role = ctx?.membership?.role;
  const showInbox = isLeadershipRole(role);

  return <Sidebar showInbox={showInbox} />;
}
