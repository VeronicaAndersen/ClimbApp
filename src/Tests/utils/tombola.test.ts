import { describe, expect, it } from "vitest";
import {
  GUEST_NAME_MAX_LENGTH,
  climberFromRegistration,
  climberKey,
  newGuest,
  parseSavedTombola,
  remainingFromKeys,
  winnersFromKeys,
} from "@/utils/tombola";

describe("parseSavedTombola", () => {
  it("returns an empty tombola for missing or broken data", () => {
    expect(parseSavedTombola(null)).toEqual({ guests: [], winnerKeys: [] });
    expect(parseSavedTombola("not json")).toEqual({ guests: [], winnerKeys: [] });
    expect(parseSavedTombola("42")).toEqual({ guests: [], winnerKeys: [] });
  });

  it("reads guests and winner keys", () => {
    const raw = JSON.stringify({
      guests: [{ key: "gabc", name: "Anna", level: null }],
      winnerKeys: ["c1", "gabc"],
    });
    expect(parseSavedTombola(raw)).toEqual({
      guests: [{ key: "gabc", name: "Anna", level: null }],
      winnerKeys: ["c1", "gabc"],
    });
  });

  it("drops malformed guests and winner keys", () => {
    const raw = JSON.stringify({
      guests: [{ key: "c1", name: "Not a guest" }, { key: "g1" }, null, { key: "g2", name: "Bo" }],
      winnerKeys: ["c1", 7, null],
    });
    expect(parseSavedTombola(raw)).toEqual({
      guests: [{ key: "g2", name: "Bo", level: null }],
      winnerKeys: ["c1"],
    });
  });

  it("migrates the older format that stored whole registrations", () => {
    const raw = JSON.stringify({
      winners: [
        { user_id: 3, level: 2 },
        { user_id: 9, level: 1 },
      ],
      remainingParticipants: [{ user_id: 4, level: 5 }],
    });
    expect(parseSavedTombola(raw)).toEqual({
      guests: [],
      winnerKeys: [climberKey(3), climberKey(9)],
    });
  });
});

describe("newGuest", () => {
  it("trims and caps the name and marks it as a guest", () => {
    const guest = newGuest(`  ${"x".repeat(GUEST_NAME_MAX_LENGTH + 5)}  `, "id1");
    expect(guest.key).toBe("gid1");
    expect(guest.name).toHaveLength(GUEST_NAME_MAX_LENGTH);
    expect(guest.level).toBeNull();
  });
});

describe("winnersFromKeys / remainingFromKeys", () => {
  const anna = { key: "c1", name: "Anna", level: 2 };
  const bo = { key: "c2", name: "Bo", level: 3 };
  const guest = { key: "gx", name: "Gäst", level: null };
  const all = [anna, bo, guest];

  it("keeps winners in draw order and skips keys no one has", () => {
    expect(winnersFromKeys(all, ["gx", "gone", "c1"])).toEqual([guest, anna]);
  });

  it("leaves everyone who has not won, in participant order", () => {
    expect(remainingFromKeys(all, ["c1"])).toEqual([bo, guest]);
    expect(remainingFromKeys(all, [])).toEqual(all);
  });
});

describe("climberFromRegistration", () => {
  const reg = {
    comp_id: 1,
    user_id: 5,
    level: 3,
    approved: true,
    created_at: "2026-01-01",
    climber_name: "bergsget",
  };

  it("uses the full name when known", () => {
    expect(climberFromRegistration({ ...reg, firstname: "Ada", lastname: "Lind" })).toEqual({
      key: "c5",
      name: "Ada Lind",
      level: 3,
    });
  });

  it("uses the part of the name that is known", () => {
    expect(climberFromRegistration({ ...reg, firstname: "Ada", lastname: null }).name).toBe("Ada");
  });

  it("falls back to the username when no name is known or the API sends none", () => {
    expect(climberFromRegistration({ ...reg, firstname: null, lastname: null }).name).toBe(
      "bergsget"
    );
    expect(climberFromRegistration(reg).name).toBe("bergsget");
  });
});
