import { createAdminClient } from "@/lib/supabase/admin";
import {
  SHIPMENT_STATUSES,
  isShipmentEligible,
  matchesShipmentStatus,
  type ShipmentStatus,
  type ShipmentStatusFilter,
} from "@/lib/admin/day8";

export type ShippingAddress = {
  recipient: string;
  phone: string;
  address: string;
  province: string;
  postal_code: string;
} | null;

type Relation<T> = T | T[] | null;

type RawShipmentRegistration = {
  id: string;
  bib_number: string | null;
  shipping_address: ShippingAddress;
  registered_at: string;
  users: Relation<{ name: string | null; email: string | null }>;
  packages: Relation<{
    name: string;
    has_physical_medal: boolean;
    target_distance_km: number;
  }>;
  events: Relation<{ title: string }>;
  shipments: Relation<{
    carrier: string | null;
    tracking_no: string | null;
    status: string;
    shipped_at: string | null;
  }>;
  submissions: Array<{ distance_km: number | string; status: string }> | null;
};

export type AdminShipmentRow = {
  id: string;
  bibNumber: string | null;
  shippingAddress: ShippingAddress;
  registeredAt: string;
  user: { name: string | null; email: string | null } | null;
  packageName: string;
  eventTitle: string;
  approvedDistanceKm: number;
  targetDistanceKm: number;
  shipment: {
    carrier: string | null;
    trackingNo: string | null;
    status: ShipmentStatus;
    shippedAt: string | null;
  };
};

export const shipmentStatusLabel: Record<ShipmentStatus, string> = {
  pending: "รอดำเนินการ",
  packed: "แพ็กแล้ว",
  shipped: "จัดส่งแล้ว",
  delivered: "ถึงแล้ว",
};

export type ShipmentFilters = {
  q?: string;
  status?: ShipmentStatusFilter;
};

function firstRelation<T>(value: Relation<T>) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeSearchValue(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("th-TH")
    .trim();
}

function normalizeShipmentStatus(value: string | undefined): ShipmentStatus {
  return SHIPMENT_STATUSES.includes(value as ShipmentStatus)
    ? (value as ShipmentStatus)
    : "pending";
}

export function normalizeShipmentStatusFilter(value: string | undefined): ShipmentStatusFilter {
  return value === "all" || SHIPMENT_STATUSES.includes(value as ShipmentStatus)
    ? (value as ShipmentStatusFilter)
    : "pending";
}

export async function getAdminShipments(filters: ShipmentFilters = {}) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("registrations")
    .select(
      "id, bib_number, shipping_address, registered_at, users(name, email), packages!inner(name, has_physical_medal, target_distance_km), events(title), shipments(carrier, tracking_no, status, shipped_at), submissions(distance_km, status)",
    )
    .eq("status", "confirmed")
    .eq("packages.has_physical_medal", true)
    .order("registered_at", { ascending: true });
  if (error) throw new Error(error.message);

  const rows = ((data ?? []) as unknown as RawShipmentRegistration[])
    .map((registration): AdminShipmentRow | null => {
      const packageRow = firstRelation(registration.packages);
      if (!packageRow) return null;
      const shipmentRow = firstRelation(registration.shipments);
      const approvedDistanceKm = (registration.submissions ?? [])
        .filter((submission) => submission.status === "approved")
        .reduce((sum, submission) => sum + Number(submission.distance_km), 0);
      const shipmentStatus = normalizeShipmentStatus(shipmentRow?.status);

      if (
        !isShipmentEligible({
          id: registration.id,
          approvedDistanceKm,
          targetDistanceKm: Number(packageRow.target_distance_km),
          shipmentStatus,
        })
      ) {
        return null;
      }

      return {
        id: registration.id,
        bibNumber: registration.bib_number,
        shippingAddress: registration.shipping_address,
        registeredAt: registration.registered_at,
        user: firstRelation(registration.users),
        packageName: packageRow.name,
        eventTitle: firstRelation(registration.events)?.title ?? "ไม่ทราบชื่องาน",
        approvedDistanceKm,
        targetDistanceKm: Number(packageRow.target_distance_km),
        shipment: {
          carrier: shipmentRow?.carrier ?? null,
          trackingNo: shipmentRow?.tracking_no ?? null,
          status: shipmentStatus,
          shippedAt: shipmentRow?.shipped_at ?? null,
        },
      };
    })
    .filter((row): row is AdminShipmentRow => row !== null);

  const status = normalizeShipmentStatusFilter(filters.status);
  const searchNeedle = normalizeSearchValue(filters.q);

  return rows.filter((registration) => {
    if (!matchesShipmentStatus(registration.shipment.status, status)) return false;
    if (!searchNeedle) return true;
    const address = registration.shippingAddress;
    return [
      registration.user?.name,
      registration.user?.email,
      registration.eventTitle,
      registration.packageName,
      registration.bibNumber,
      address?.recipient,
      address?.phone,
      address?.address,
      address?.province,
      address?.postal_code,
      registration.shipment.carrier,
      registration.shipment.trackingNo,
      shipmentStatusLabel[registration.shipment.status],
    ].some((value) => normalizeSearchValue(value).includes(searchNeedle));
  });
}
