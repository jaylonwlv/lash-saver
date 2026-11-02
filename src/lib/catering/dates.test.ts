import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addDays,
  balanceDueDate,
  dateState,
  daysBetween,
  formatClock,
  formatEventDate,
  minutesBetween,
  payInFullNow,
  todayIn,
} from "./dates";

const w = { min_notice_days: 7, max_advance_days: 365, daily_capacity: 2 };

describe("catering dates", () => {
  it("adds days across months, years and leap days", () => {
    assert.equal(addDays("2027-01-31", 1), "2027-02-01");
    assert.equal(addDays("2027-12-31", 1), "2028-01-01");
    assert.equal(addDays("2028-02-28", 1), "2028-02-29");
    assert.equal(addDays("2027-03-01", -1), "2027-02-28");
    assert.equal(daysBetween("2027-03-13", "2027-03-15"), 2); // across US DST change
  });

  it("uses the owner's time zone for today", () => {
    const lateNightUtc = new Date("2027-06-15T03:00:00Z"); // 8 PM June 14 in Los Angeles
    assert.equal(todayIn("America/Los_Angeles", lateNightUtc), "2027-06-14");
    assert.equal(todayIn("America/New_York", lateNightUtc), "2027-06-14");
    assert.equal(todayIn("UTC", lateNightUtc), "2027-06-15");
  });

  it("decides date states: notice, advance, blocked, capacity", () => {
    const today = "2027-06-01";
    const blocked = new Set(["2027-06-20"]);
    const held = new Map([
      ["2027-06-21", 2],
      ["2027-06-22", 1],
    ]);
    assert.equal(dateState("2027-06-07", today, w, blocked, held), "too_soon");
    assert.equal(dateState("2027-06-08", today, w, blocked, held), "ok");
    assert.equal(dateState("2028-06-01", today, w, blocked, held), "too_far");
    assert.equal(dateState("2027-06-20", today, w, blocked, held), "blocked");
    assert.equal(dateState("2027-06-21", today, w, blocked, held), "full");
    assert.equal(dateState("2027-06-22", today, w, blocked, held), "ok");
  });

  it("charges in full inside the balance window", () => {
    assert.equal(payInFullNow("2027-06-14", "2027-06-07", 7), true);
    assert.equal(payInFullNow("2027-06-14", "2027-06-06", 7), false);
    assert.equal(balanceDueDate("2027-06-14", 7), "2027-06-07");
    assert.equal(payInFullNow("2027-06-14", "2027-06-13", 0), false);
  });

  it("formats", () => {
    assert.equal(minutesBetween("17:00", "19:30"), 150);
    assert.equal(formatClock("17:30:00"), "5:30 PM");
    assert.equal(formatClock("00:15"), "12:15 AM");
    assert.equal(formatEventDate("2027-06-14"), "Monday, June 14, 2027");
  });
});
