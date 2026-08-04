/**
 * ModuleManifest describes metadata about any registered module — an
 * adapter, plugin, middleware, or engine. It used to live in
 * src/runtime/registry/index.ts, which meant storage adapters importing it
 * (see src/storage/adapters/mongodb.ts) had an import edge into `runtime/`
 * — a real violation of "adapters must not import Runtime" (see
 * docs/architecture/dependency_graph.md), caught by
 * tests/architecture/architecture-ts.ts. Moved here — a neutral, shared
 * location with no dependencies of its own — so neither side needs to
 * import the other's module tree just for this type.
 */
export interface ModuleManifest {
  name: string;
  version: string;
  type: 'adapter' | 'plugin' | 'middleware' | 'engine';
  capabilities: string[];
}
