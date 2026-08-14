import { describe, expect, it } from "vitest";
import { extractMentions, mentionToken, parseMentions } from "./mentions";

describe("mentions", () => {
  it("creates and parses safe entity links", () => {
    const token = mentionToken({ module: "people", id: "person-1", label: "Demo Speaker" });
    expect(token).toBe("@[Demo Speaker](people:person-1)");
    expect(parseMentions(`Подключить ${token} к задаче.`)).toEqual([
      { type: "text", value: "Подключить " },
      { type: "mention", reference: { module: "people", id: "person-1", label: "Demo Speaker" } },
      { type: "text", value: " к задаче." }
    ]);
  });

  it("extracts only supported workspace entities", () => {
    expect(extractMentions("@[Task](tasks:task-1) @[Doc](documents:doc-1) @[Unknown](not-a-module:x)")).toEqual([
      { module: "tasks", id: "task-1", label: "Task" },
      { module: "documents", id: "doc-1", label: "Doc" }
    ]);
  });
});
