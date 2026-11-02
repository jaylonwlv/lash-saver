import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cateringJobs, type DueBooking } from "./catering-due";

const b = (over: Partial<DueBooking> = {}): DueBooking => ({
  status: "confirmed",
  event_date: "2027-06-14",
  balance_due_date: "2027-06-07",
  balance_cents: 100_000,
  balance_paid_at: null,
  deposit_paid_date: "2027-03-01",
  ...over,
});

describe("cateringJobs", () => {
  it("sends the 7-day reminder, then the 2-day one, then overdue", () => {
    assert.deepEqual(cateringJobs(b(), "2027-05-30"), []);
    assert.deepEqual(cateringJobs(b(), "2027-05-31"), ["balance_reminder_7d"]);
    assert.deepEqual(cateringJobs(b(), "2027-06-04"), ["balance_reminder_7d"]);
    assert.deepEqual(cateringJobs(b(), "2027-06-05"), ["balance_reminder_2d"]);
    assert.deepEqual(cateringJobs(b(), "2027-06-07"), ["mark_balance_due", "balance_reminder_2d"]);
    assert.deepEqual(cateringJobs(b({ status: "balance_due" }), "2027-06-08"), ["balance_overdue"]);
  });

  it("stops once the balance is paid", () => {
    assert.deepEqual(
      cateringJobs(b({ status: "paid_in_full", balance_paid_at: "x" }), "2027-06-05"),
      [],
    );
    assert.deepEqual(cateringJobs(b({ balance_paid_at: "x" }), "2027-06-05"), []);
  });

  it("skips reminders on the day they booked", () => {
    assert.deepEqual(cateringJobs(b({ deposit_paid_date: "2027-06-05" }), "2027-06-05"), []);
  });

  it("sends the day-before summary and completes past events", () => {
    assert.deepEqual(cateringJobs(b({ status: "paid_in_full" }), "2027-06-13"), ["day_before"]);
    assert.deepEqual(cateringJobs(b({ status: "balance_due" }), "2027-06-13"), [
      "balance_overdue",
      "day_before",
    ]);
    assert.deepEqual(cateringJobs(b({ status: "paid_in_full" }), "2027-06-15"), ["mark_completed"]);
  });

  it("ignores bookings that don't hold the date", () => {
    for (const status of ["awaiting_deposit", "cancelled", "expired", "completed", "requested"]) {
      assert.deepEqual(cateringJobs(b({ status }), "2027-06-13"), []);
    }
  });
});
