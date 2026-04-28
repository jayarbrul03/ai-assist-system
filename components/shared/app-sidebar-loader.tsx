import { getActiveScheme } from "@/lib/scheme";
import {
  isLeadershipRole,
  isResidentRole,
  isManagerRole,
  isCommitteeRole,
} from "@/lib/roles";
import { Sidebar } from "./sidebar";

/**
 * Resolves org role and passes feature flags to the client sidebar.
 */
export async function AppSidebarLoader() {
  const ctx = await getActiveScheme();
  const role = ctx?.membership?.role;
  return (
    <Sidebar
      showInbox={isLeadershipRole(role)}
      showMyCase={isResidentRole(role)}
      showManagerHub={isManagerRole(role)}
      showCommitteeHub={isCommitteeRole(role)}
    />
  );
}
