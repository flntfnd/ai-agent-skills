// Which skills go to which tsconfig project, and every sample that gets special treatment.
// A skill with a TypeScript fence that isn't listed here fails the run.
export const projects = {
    web: ["web-platform"],
    backend: ["backend-conventions"],
};

// Key: "<path under skills/claude>#<zero-based index of the ts/tsx/typescript fence in that file>".
//   { skip: "reason" }        leave the fence out. The reason is required.
//   { file: "path" }          write it to this path inside the project.
//   { before: "", after: "" } wrap a fragment that can't stand alone.
// Everything else is placed by rule: a first line of "// some/path.ts" is the destination,
// anything without one lands in the project root, and every sample gets "export {};" appended
// so it's a module and its top-level names can't collide with another sample's.
export const overrides = {};
