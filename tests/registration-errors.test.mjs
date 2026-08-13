import assert from "node:assert/strict";
import test from "node:test";
import { getRegistrationErrorMessage } from "../lib/registration-errors.ts";

test("maps duplicate registrations to a friendly message", () => {
  assert.equal(
    getRegistrationErrorMessage({ code: "23505", message: "duplicate key" }),
    "คุณลงทะเบียนแพ็กเกจนี้ไปแล้ว",
  );
});

test("distinguishes missing shipping details from a closed event", () => {
  assert.equal(
    getRegistrationErrorMessage({ code: "23514", message: "shipping_address_required" }),
    "กรุณากรอกที่อยู่จัดส่งให้ครบถ้วน",
  );
  assert.equal(
    getRegistrationErrorMessage({ code: "23514", message: "event_registration_closed" }),
    "งานนี้สิ้นสุดแล้วและไม่เปิดรับสมัคร",
  );
});

test("falls back to the database message", () => {
  assert.equal(getRegistrationErrorMessage({ message: "database unavailable" }), "database unavailable");
});
