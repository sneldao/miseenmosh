/** Pilot ingredient: the fillet Petra is actually turning in her tongs.
 *  Carries inside the prepared tongs' jaw span via the embedded
 *  RightToolSocket — position/orientation come from root's frozen
 *  food-carry/contact/tool-fit studies, not re-derived animation. */

import { useLayoutEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import { CapsuleGeometry, SRGBColorSpace, TorusGeometry, Matrix4, Quaternion, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import filletURL from "../../assets/recraft/food-lino/seared-beef-surface.webp";

// food-carry-study.json: localPosition = [0,-.015,.26] + offset_in_tool
const POSITION = [
  0 - 0.05748590912234523,
  -0.015 - 0.010067146191286753,
  0.26 + 0.03326065562571957,
] as const;
// inv( contact-study-loop frame0 Right.Hand.q * tool-fit tongs_rotation )
const QUATERNION = new Quaternion(
  0.29726068116042564,
  -0.72501339255785,
  0.5793249287354656,
  0.22444218630516988
);

export const FILLET_IN_TOOL = new Matrix4().compose(
  new Vector3(...POSITION),
  QUATERNION,
  new Vector3(1, 1, 1)
);

export default function SearingFillet(): JSX.Element {
  const tex = useTexture(filletURL);
  tex.colorSpace = SRGBColorSpace;

  const geo = useMemo(() => {
    const g = new CapsuleGeometry(0.035, 0.11, 6, 20).rotateZ(Math.PI / 2);
    // deliberately shaped: subtle INWARD radial variation only, fibres
    // run along X so the sear texture reads as meat grain
    const pos = g.attributes.position;
    const v = new Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const theta = Math.atan2(v.z, v.y);
      const f = 0.97 + 0.03 * Math.sin(3 * theta + 12 * v.x);
      pos.setY(i, v.y * f);
      pos.setZ(i, v.z * f);
    }
    // swap UV u/v so the lino fibres follow the long axis
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i);
      uv.setX(i, uv.getY(i));
      uv.setY(i, u);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  const twine = useMemo(() => {
    const loops = [-0.045, -0.015, 0.015, 0.045].map((x) =>
      new TorusGeometry(0.0353, 0.0007, 6, 24).rotateY(Math.PI / 2).translate(x, 0, 0)
    );
    return mergeGeometries(loops);
  }, []);

  useLayoutEffect(
    () => () => {
      geo.dispose();
      twine.dispose();
    },
    [geo, twine]
  );

  return (
    <group>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial color="#ffffff" map={tex} metalness={0} roughness={0.68} />
      </mesh>
      <mesh geometry={twine}>
        <meshStandardMaterial color="#ded0ad" roughness={0.95} metalness={0} />
      </mesh>
    </group>
  );
}
