import { describe, expect, it } from "vitest";
import { employeeIdentity, parseEmployeeDirectory } from "./employee-import";

describe("employee directory import", () => {
  it("parses department, phone and status notes", () => {
    const rows = parseEmployeeDirectory([
      "Центр IT",
      "ФИО\tДолжность\tГородской телефон\tВнутренний/IP телефон\tМобильный\tАдрес\tКабинет\tДругая информация",
      "Иванов Иван Иванович\tИнженер\tСотрудник в отпуске\t1234\t+7 700 111 22 33\tАстана\t401\t",
      "email: ivanov@example.com",
      "Подробная информация",
      "",
      "Центр IT",
      "Петров Пётр\tАналитик\t-\t-\t+7 701 222 33 44\t-\t-\t",
      "email: petrov@example.com",
      "Петров Пётр\tАналитик\t-\t-\t+7 701 222 33 44\t-\t-\t",
      "email: petrov@example.com"
    ].join("\n"));

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ department: "Центр IT", position: "Инженер", phone: "+7 700 111 22 33", email: "ivanov@example.com", contact_kind: "Employee" });
    expect(rows[0].notes).toContain("Сотрудник в отпуске");
  });

  it("uses stable identity keys for deduplication", () => {
    expect(employeeIdentity({ name: "Иван Иванов", email: " IVAN@example.com ", phone: "" })).toBe("email:ivan@example.com");
    expect(employeeIdentity({ first_name: "Иван", last_name: "Иванов", phone: "+7 (700) 111-22-33" })).toBe("name:иваниванов|phone:77001112233");
  });
});
