import * as fs from 'fs';
import * as path from 'path';

// Explicitly requested by the story's acceptance criteria: "verify this is architecturally
// impossible, not just unused." This scans the actual source text of every file in this
// module for any import specifier that could reach the Stream/Subject enrollment models —
// a source-level guarantee, not a behavioral/mocked one. If a future change ever adds an
// import to enrollments/, StudentEntity, or ALStreamEntity anywhere in src/career/, this
// test fails immediately, regardless of whether the import is ever actually used.
const FORBIDDEN_IMPORT_SUBSTRINGS = [
  'enrollments/',
  'student.entity',
  'al-stream',
  'student-subject-enrollment',
];

function listTsFilesRecursive(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTsFilesRecursive(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('Career (Self-Discovery) module — structural isolation from Stream/Subject enrollment', () => {
  const careerDir = __dirname;
  const files = listTsFilesRecursive(careerDir);

  it('found at least the expected module files (sanity check that the scan is actually running)', () => {
    expect(files.length).toBeGreaterThanOrEqual(8);
  });

  it.each(files.map((f) => [path.relative(careerDir, f), f]))(
    '%s has no import of the Stream or StudentSubjectEnrollment models, or StudentEntity',
    (_relative, fullPath) => {
      const source = fs.readFileSync(fullPath, 'utf8');
      const importLines = source
        .split('\n')
        .filter((line) => /\bfrom\s+['"]/.test(line) || /\brequire\(/.test(line));

      for (const line of importLines) {
        const lower = line.toLowerCase();
        for (const forbidden of FORBIDDEN_IMPORT_SUBSTRINGS) {
          expect(lower).not.toContain(forbidden);
        }
      }
    },
  );

  it('the module registration imports nothing beyond its own entity (no UsersModule/StudentsModule/StaffModule)', () => {
    const moduleSource = fs.readFileSync(path.join(careerDir, 'career.module.ts'), 'utf8');
    const importLines = moduleSource
      .split('\n')
      .filter((line) => /^\s*import\b/.test(line))
      .join('\n');
    expect(importLines).not.toMatch(/StudentsModule/);
    expect(importLines).not.toMatch(/UsersModule/);
    expect(importLines).not.toMatch(/StaffModule/);
    expect(importLines).not.toMatch(/EnrollmentsModule/);
  });
});
