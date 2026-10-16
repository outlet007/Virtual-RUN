import { redirect } from "next/navigation";

export default function LegacyAdminSubmissionsPage() {
  redirect("/admin/events");
}
