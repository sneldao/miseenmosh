import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Group, Matrix4, Mesh, MeshStandardMaterial, type BufferGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

function materialKey(material: unknown): string | null {
  if (!(material instanceof MeshStandardMaterial)) return null;
  const c = material.color.getHexString();
  const e = material.emissive.getHexString();
  return [
    material.type, c, e, material.roughness, material.metalness,
    material.opacity, material.transparent ? 1 : 0, material.side,
    material.map?.uuid ?? "-", material.emissiveIntensity,
    material.depthWrite ? 1 : 0,
  ].join("|");
}

function blocked(node: { userData?: Record<string, unknown>; parent: unknown }): boolean {
  let n: { userData?: Record<string, unknown>; parent?: unknown } | null | undefined = node;
  while (n) {
    if (n.userData?.staticMerge === false) return true;
    n = n.parent as never;
  }
  return false;
}

const DISABLE_MERGE = import.meta.env.DEV
  && typeof window !== "undefined"
  && new URLSearchParams(window.location.search).has("nomerge");

/** Bake a static decorative subtree into one mesh per material/attribute set.
 *  The originals stay mounted but invisible, so React ownership is never
 *  fought; dynamic pieces must opt their branch out with staticMerge:false.
 *  Single-member buckets are left alone: replacing one draw with one draw
 *  would only add another object to traverse. */
export default function StaticMerge({ children }: { children: ReactNode }) {
  const root = useRef<Group>(null);

  useLayoutEffect(() => {
    const host = root.current;
    if (!host || DISABLE_MERGE) return;
    host.updateMatrixWorld(true);
    const inverseHost = new Matrix4().copy(host.matrixWorld).invert();
    const buckets = new Map<string, {
      material: MeshStandardMaterial;
      geometries: BufferGeometry[];
      originals: Mesh[];
      castShadow: boolean;
      receiveShadow: boolean;
    }>();

    host.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      if (!mesh.visible || blocked(mesh)) return;
      if ((mesh as unknown as { isSkinnedMesh?: boolean; isInstancedMesh?: boolean }).isSkinnedMesh) return;
      if ((mesh as unknown as { isInstancedMesh?: boolean }).isInstancedMesh) return;
      if (!mesh.geometry?.attributes?.position || mesh.geometry.type === "BufferGeometry") return;
      if (Array.isArray(mesh.material)) return;
      const matKey = materialKey(mesh.material);
      if (!matKey || (mesh.material as MeshStandardMaterial).transparent) return;
      const attrs = Object.keys(mesh.geometry.attributes).sort().join(",");
      const key = [
        matKey,
        attrs,
        mesh.geometry.index ? "indexed" : "plain",
        mesh.castShadow ? "cast" : "nocast",
        mesh.receiveShadow ? "receive" : "noreceive",
      ].join("|");
      const clone = mesh.geometry.clone();
      mesh.updateWorldMatrix(true, false);
      clone.applyMatrix4(new Matrix4().copy(inverseHost).multiply(mesh.matrixWorld));
      const material = mesh.material as MeshStandardMaterial;
      const bucket = buckets.get(key) ?? {
        material,
        geometries: [],
        originals: [],
        castShadow: mesh.castShadow,
        receiveShadow: mesh.receiveShadow,
      };
      bucket.geometries.push(clone);
      bucket.originals.push(mesh);
      buckets.set(key, bucket);
    });

    const merged: Mesh[] = [];
    const restore: Array<[Mesh, boolean]> = [];
    for (const bucket of buckets.values()) {
      if (bucket.geometries.length < 2) {
        for (const geo of bucket.geometries) geo.dispose();
        continue;
      }
      const geometry = mergeGeometries(bucket.geometries, false);
      for (const geo of bucket.geometries) geo.dispose();
      if (!geometry) continue;
      const mesh = new Mesh(geometry, bucket.material);
      mesh.name = "static-merge";
      mesh.userData.staticMerged = true;
      mesh.castShadow = bucket.castShadow;
      mesh.receiveShadow = bucket.receiveShadow;
      mesh.matrixAutoUpdate = false;
      host.add(mesh);
      merged.push(mesh);
      for (const original of bucket.originals) {
        restore.push([original, original.visible]);
        original.visible = false;
      }
    }
    if (!merged.length) return;
    (host as Group & { __mergedStatic?: Mesh[] }).__mergedStatic = merged;

    return () => {
      const baked = (host as Group & { __mergedStatic?: Mesh[] }).__mergedStatic ?? [];
      for (const mesh of baked) {
        host.remove(mesh);
        mesh.geometry.dispose();
      }
      delete (host as Group & { __mergedStatic?: Mesh[] }).__mergedStatic;
      for (const [mesh, visible] of restore) mesh.visible = visible;
    };
  }, []);

  return <group ref={root}>{children}</group>;
}
