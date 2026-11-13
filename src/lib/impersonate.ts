import { api } from "./api";
import { TENANT_APP_URL } from "./env";

/**
 * Open a company in the tenant web app as a read-only "view as tenant" session.
 * Mints a short-lived, read-only impersonation token on the backend and opens the
 * tenant app with it. Writes are blocked server-side for impersonation tokens.
 */
export async function viewAsTenant(companyId: string): Promise<void> {
  const res = await api.post<{ token: string; company: { name?: string } }>(
    `/superadmin/impersonate/${companyId}`,
  );
  if (!res?.token) throw new Error("No impersonation token returned");
  const url = new URL(TENANT_APP_URL);
  url.searchParams.set("impersonate_token", res.token);
  url.searchParams.set("impersonate_company", res.company?.name || "Tenant");
  window.open(url.toString(), "_blank", "noopener");
}
