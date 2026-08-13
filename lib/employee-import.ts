import type { EmployeeImportRow } from "./types";

function clean(value: string | undefined) {
  const next = (value ?? "").trim();
  return next === "-" || next === "—" ? "" : next;
}

function splitName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts.shift() ?? value.trim(),
    last_name: parts.join(" ")
  };
}

function normalizeKey(value: string) {
  return value.normalize("NFKD").toLocaleLowerCase("ru-RU").replace(/[^\p{L}\p{N}@.+]/gu, "");
}

function employeeKey(row: EmployeeImportRow) {
  return row.email ? `email:${normalizeKey(row.email)}` : `name:${normalizeKey(row.name)}|phone:${row.phone.replace(/\D/g, "")}`;
}

/** Parses the exported employee directory without persisting the source file in the repository. */
export function parseEmployeeDirectory(markdown: string): EmployeeImportRow[] {
  const rows: EmployeeImportRow[] = [];
  let department = "";
  let previousCells: string[] | null = null;

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/^(?:Продуктовый центр|Центр\s+.+)$/u.test(line)) {
      department = line;
      previousCells = null;
      continue;
    }
    if (/^ФИО\s+/u.test(line) || /^Подробная информация$/u.test(line)) continue;

    const emailMatch = line.match(/^email:\s*(\S+)/iu);
    if (emailMatch && previousCells) {
      const [fullName, position, cityPhone, internalPhone, mobile, address, room, extra] = previousCells;
      const name = clean(fullName);
      const email = clean(emailMatch[1]);
      if (name && email) {
        const nameParts = splitName(name);
        const notes = [cityPhone, internalPhone, address, room, extra].map(clean).filter(Boolean).join(" · ");
        rows.push({
          name,
          ...nameParts,
          position: clean(position),
          department,
          email,
          phone: clean(mobile),
          contact_kind: "Employee",
          ...(notes ? { notes } : {})
        });
      }
      previousCells = null;
      continue;
    }

    const cells = rawLine.split("\t").map((cell) => cell.trim());
    if (cells.length >= 5 && cells[0] && !cells[0].startsWith("email:")) previousCells = cells;
  }

  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = employeeKey(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function employeeIdentity(row: { name?: string; first_name?: string; last_name?: string; email?: string; phone?: string }) {
  const email = String(row.email ?? "").trim();
  if (email) return `email:${normalizeKey(email)}`;
  const name = "name" in row ? row.name : [row.first_name, row.last_name].filter(Boolean).join(" ");
  return `name:${normalizeKey(name ?? "")}|phone:${String(row.phone ?? "").replace(/\D/g, "")}`;
}
