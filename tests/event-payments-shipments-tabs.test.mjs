import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("payments and shipments are removed from aggregate admin surfaces", async () => {
  const [layout, overview, paymentsPage, shipmentsPage, exportRoute] = await Promise.all([
    read("app/admin/layout.tsx"),
    read("app/admin/page.tsx"),
    read("app/admin/payments/page.tsx"),
    read("app/admin/shipments/page.tsx"),
    read("app/admin/shipments/export/route.ts"),
  ]);

  assert.equal(layout.includes('href: "/admin/payments"'), false);
  assert.equal(layout.includes('href: "/admin/shipments"'), false);
  assert.equal(overview.includes("/admin/payments"), false);
  assert.equal(overview.includes("/admin/shipments"), false);
  assert.equal(overview.includes('.from("payments")'), false);
  assert.equal(overview.includes("getAdminShipments"), false);
  assert.equal(paymentsPage.includes('redirect("/admin/events")'), true);
  assert.equal(shipmentsPage.includes('redirect("/admin/events")'), true);
  assert.equal(exportRoute.includes('NextResponse.redirect(new URL("/admin/events"'), true);
});

test("event tabs order registrations, submissions, payments, then shipments", async () => {
  const page = await read("app/admin/events/[id]/page.tsx");
  const registrations = page.indexOf('id: "registrations"');
  const submissions = page.lastIndexOf('id: "submissions"');
  const payments = page.lastIndexOf('id: "payments"');
  const shipments = page.lastIndexOf('id: "shipments"');

  assert.ok(registrations >= 0);
  assert.ok(submissions > registrations);
  assert.ok(payments > submissions);
  assert.ok(shipments > payments);

  const staffSection = page.slice(page.indexOf('if (role === "staff")'), page.indexOf('const { data: event }'));
  assert.equal(staffSection.includes('id: "submissions"'), true);
  assert.equal(staffSection.includes('id: "payments"'), true);
  assert.equal(staffSection.includes('id: "shipments"'), true);
  assert.equal(staffSection.includes('id: "overview"'), false);
});

test("payment review is scoped to the selected event", async () => {
  const [tab, actions] = await Promise.all([
    read("components/admin/event-payments-tab.tsx"),
    read("lib/actions/admin.ts"),
  ]);

  assert.equal(tab.includes("registrations!inner(id, event_id,"), true);
  assert.equal(tab.includes('.eq("registrations.event_id", eventId)'), true);
  assert.equal(tab.includes('name="event_id" value={eventId}'), true);
  assert.equal(tab.includes('name="payment_q"'), true);
  assert.equal(actions.includes("requirePaymentInEvent"), true);
  assert.equal(actions.includes('.eq("registrations.event_id", eventId)'), true);
  assert.equal(actions.includes("tab=payments"), true);
});

test("shipment management and CSV export are scoped to the selected event", async () => {
  const [tab, action, query, exportRoute] = await Promise.all([
    read("components/admin/event-shipments-tab.tsx"),
    read("lib/actions/shipments.ts"),
    read("lib/admin/shipments.ts"),
    read("app/admin/events/[id]/shipments/export/route.ts"),
  ]);

  assert.equal(tab.includes("getAdminShipments({ eventId, q, status })"), true);
  assert.equal(tab.includes('name="event_id" value={eventId}'), true);
  assert.equal(tab.includes("shipment_q"), true);
  assert.equal(tab.includes("shipment_status"), true);
  assert.equal(query.includes('if (filters.eventId) query = query.eq("event_id", filters.eventId)'), true);
  assert.equal(action.includes('.eq("event_id", eventId)'), true);
  assert.equal(action.includes('"/admin/events/" + eventId'), true);
  assert.equal(exportRoute.includes("const { id: eventId } = await params"), true);
  assert.equal(exportRoute.includes("eventId,"), true);
});