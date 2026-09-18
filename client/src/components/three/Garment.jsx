import { Component, Suspense, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { Decal } from '@react-three/drei';
import { DEFAULT_STYLE } from '../../lib/catalog.js';

// Procedural placeholder garments built from primitives: a base torso plus
// swappable neckline / sleeve / hoodie-part meshes. Swap the torso for a
// GLTF/GLB mesh by replacing <mesh geometry={torso}> (see README "3D models").

const FRONT_Z = 0.55;
const DEPTH_SCALE = 0.55;
const SKIN = '#e2bda0';

// (radius, y) side profile of the torso, bottom to top. radiusAt() interpolates it so
// patches (V-neck, placket, zipper, pockets) can be laid exactly on the surface.
const PROFILE = [[0.92, -1.3], [0.96, -0.6], [0.98, 0.1], [1.0, 0.55], [1.02, 0.8], [0.9, 0.95], [0.5, 1.02], [0.42, 1.12]];

function radiusAt(y) {
  if (y <= PROFILE[0][1]) return PROFILE[0][0];
  for (let i = 1; i < PROFILE.length; i++) {
    const [r0, y0] = PROFILE[i - 1];
    const [r1, y1] = PROFILE[i];
    if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
  }
  return PROFILE[PROFILE.length - 1][0];
}

const surfaceZ = (y, x) => DEPTH_SCALE * Math.sqrt(Math.max(0, radiusAt(y) ** 2 - x * x));

function buildTorso() {
  const profile = [[0, -1.3], ...PROFILE, [0, 1.12]].map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(profile, 72);
  geo.scale(1, 1, DEPTH_SCALE);
  geo.computeVertexNormals();
  return geo;
}

// A grid of vertices draped over the front of the torso between yTop and yBottom,
// with per-row left/right x limits. `lift` pushes it slightly off the surface.
function surfacePatch({ yTop, yBottom, xLeft, xRight, lift = 0.012, rows = 18, cols = 10 }) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const y = yTop + (yBottom - yTop) * t;
    const r = radiusAt(y) - 0.002;
    const xl = Math.max(-r, xLeft(y));
    const xr = Math.min(r, xRight(y));
    for (let j = 0; j <= cols; j++) {
      const s = j / cols;
      const x = xl + (xr - xl) * s;
      positions.push(x, y, surfaceZ(y, x) + lift);
      uvs.push(s, 1 - t);
    }
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j;
      const b = a + 1;
      const c = a + cols + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildPocket() {
  const profile = [new THREE.Vector2(1.0, -1.05), new THREE.Vector2(1.01, -0.5)];
  const geo = new THREE.LatheGeometry(profile, 24, -0.6, 1.2);
  geo.scale(1, 1, DEPTH_SCALE);
  geo.computeVertexNormals();
  return geo;
}

// Ribbing / trim colour: a shade of the garment colour that stays visible on black and white.
function trimColorFor(hex) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, hsl.l < 0.35 ? hsl.l + 0.16 : hsl.l - 0.16);
  return `#${c.getHexString()}`;
}

class DecalErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidUpdate(prev) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false });
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function DesignDecal({ url, config, side }) {
  const texture = useLoader(THREE.TextureLoader, url);
  useLayoutEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }, [texture]);

  const aspect = texture.image?.width && texture.image?.height ? texture.image.width / texture.image.height : 1;
  const { x = 0, y = 0.25, scale = 0.9, rotation = 0 } = config || {};
  const back = side === 'back';

  return (
    <Decal
      position={[back ? -x : x, y, back ? -FRONT_Z : FRONT_Z]}
      rotation={[0, back ? Math.PI : 0, THREE.MathUtils.degToRad(rotation)]}
      scale={[scale, scale / aspect, 1]}
      depthTest
      polygonOffsetFactor={-4}
      map={texture}
    >
      <meshStandardMaterial map={texture} transparent polygonOffset polygonOffsetFactor={-4} depthTest depthWrite={false} roughness={0.75} />
    </Decal>
  );
}

function Patch({ geometry, color }) {
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} roughness={0.9} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  );
}

// ---- Sleeves -------------------------------------------------------------

function Sleeve({ side, long, material, trim }) {
  const length = long ? 1.6 : 0.95;
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.3, long ? 0.33 : 0.35, length, 32);
    g.scale(1, 1, 0.75);
    g.computeVertexNormals();
    return g;
  }, [long, length]);
  const position = long ? [1.45 * side, 0.32, 0] : [1.25 * side, 0.55, 0];
  return (
    <group position={position} rotation={[0, 0, 0.9 * side]}>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial {...material} />
      </mesh>
      {long && (
        <mesh position={[0, -length / 2 + 0.04, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.75, 1]}>
          <torusGeometry args={[0.31, 0.045, 12, 40]} />
          <meshStandardMaterial color={trim} roughness={0.95} />
        </mesh>
      )}
    </group>
  );
}

// ---- Necklines (t-shirt) -------------------------------------------------

function RoundNeck({ trim }) {
  return (
    <mesh position={[0, 1.12, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, DEPTH_SCALE, 1]}>
      <torusGeometry args={[0.42, 0.06, 16, 48]} />
      <meshStandardMaterial color={trim} roughness={0.95} />
    </mesh>
  );
}

function VNeck({ trim, depth = 0.55, topHalfWidth = 0.36 }) {
  const { skin, band } = useMemo(() => {
    const yTop = 1.1;
    const yBottom = yTop - depth;
    const hw = (y) => Math.max(0, (topHalfWidth * (y - yBottom)) / (yTop - yBottom));
    return {
      skin: surfacePatch({ yTop, yBottom, xLeft: (y) => -hw(y), xRight: hw, lift: 0.014 }),
      band: surfacePatch({ yTop: 1.13, yBottom: yBottom - 0.08, xLeft: (y) => -hw(y) - 0.055, xRight: (y) => hw(y) + 0.055, lift: 0.008 }),
    };
  }, [depth, topHalfWidth]);
  return (
    <>
      <Patch geometry={band} color={trim} />
      <Patch geometry={skin} color={SKIN} />
    </>
  );
}

function PoloCollar({ material, trim }) {
  const placket = useMemo(() => surfacePatch({ yTop: 1.06, yBottom: 0.58, xLeft: () => -0.075, xRight: () => 0.075, lift: 0.012, cols: 4 }), []);
  const buttons = [0.94, 0.76];
  return (
    <>
      <mesh position={[0, 1.13, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, DEPTH_SCALE, 1]}>
        <torusGeometry args={[0.44, 0.055, 16, 48]} />
        <meshStandardMaterial color={trim} roughness={0.95} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.34 * s, 1.02, 0.2]} rotation={[-0.75, 0.3 * s, -0.55 * s]} castShadow>
          <boxGeometry args={[0.42, 0.02, 0.3]} />
          <meshStandardMaterial {...material} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <VNeck trim={trim} depth={0.24} topHalfWidth={0.2} />
      <Patch geometry={placket} color={trim} />
      {buttons.map((y) => (
        <mesh key={y} position={[0, y, surfaceZ(y, 0) + 0.03]}>
          <sphereGeometry args={[0.028, 12, 12]} />
          <meshStandardMaterial color="#f2f2f2" roughness={0.4} />
        </mesh>
      ))}
    </>
  );
}

// ---- Hoodie parts ---------------------------------------------------------

function Hood({ material, oversized }) {
  const s = oversized ? 1.3 : 1;
  return (
    <>
      <mesh position={[0, 0.98 + (s - 1) * 0.12, -0.12 - (s - 1) * 0.1]} scale={[s, 0.85 * s, 0.9 * s]} castShadow>
        <sphereGeometry args={[0.62, 32, 24, Math.PI, Math.PI]} />
        <meshStandardMaterial {...material} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.1, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[s, DEPTH_SCALE + 0.05, 1]}>
        <torusGeometry args={[0.48, 0.07, 16, 48]} />
        <meshStandardMaterial {...material} />
      </mesh>
      {[-0.14, 0.14].map((x) => (
        <mesh key={x} position={[x, 0.72, 0.58]}>
          <cylinderGeometry args={[0.018, 0.018, 0.5, 8]} />
          <meshStandardMaterial color="#e5e5e5" roughness={0.9} />
        </mesh>
      ))}
    </>
  );
}

function KangarooPocket({ material }) {
  const pocket = useMemo(buildPocket, []);
  return (
    <mesh geometry={pocket}>
      <meshStandardMaterial {...material} side={THREE.DoubleSide} />
    </mesh>
  );
}

function ZipFront({ trim }) {
  const { zipper, pockets } = useMemo(
    () => ({
      zipper: surfacePatch({ yTop: 1.1, yBottom: -1.27, xLeft: () => -0.035, xRight: () => 0.035, lift: 0.016, rows: 30, cols: 2 }),
      pockets: [-1, 1].map((s) =>
        surfacePatch({
          yTop: -0.5,
          yBottom: -1.12,
          xLeft: (y) => (s < 0 ? -0.95 : 0.38 + Math.max(0, -0.5 - y) * 0.25),
          xRight: (y) => (s < 0 ? -0.38 - Math.max(0, -0.5 - y) * 0.25 : 0.95),
          lift: 0.012,
          rows: 8,
          cols: 8,
        })
      ),
    }),
    []
  );
  return (
    <>
      <Patch geometry={zipper} color="#2b2b2b" />
      <mesh position={[0, 1.0, surfaceZ(1.0, 0) + 0.04]}>
        <boxGeometry args={[0.05, 0.1, 0.03]} />
        <meshStandardMaterial color="#a3a3a3" metalness={0.6} roughness={0.35} />
      </mesh>
      {pockets.map((g, i) => (
        <Patch key={i} geometry={g} color={trim} />
      ))}
    </>
  );
}

// ---- Garment ---------------------------------------------------------------

export function Garment({ type = 'tshirt', color = '#f5f5f5', style, front, back }) {
  const torso = useMemo(buildTorso, []);
  const hoodie = type === 'hoodie';
  const s = { ...DEFAULT_STYLE, ...(style || {}) };
  const material = { color, roughness: 0.88, metalness: 0 };
  const trim = useMemo(() => trimColorFor(color), [color]);
  const longSleeves = hoodie || s.sleeveLength === 'full';

  return (
    <group position={[0, 0.1, 0]}>
      <mesh geometry={torso} castShadow receiveShadow>
        <meshStandardMaterial {...material} />
        {front?.url && (
          <DecalErrorBoundary resetKey={front.url}>
            <Suspense fallback={null}>
              <DesignDecal url={front.url} config={front.config} side="front" />
            </Suspense>
          </DecalErrorBoundary>
        )}
        {back?.url && (
          <DecalErrorBoundary resetKey={back.url}>
            <Suspense fallback={null}>
              <DesignDecal url={back.url} config={back.config} side="back" />
            </Suspense>
          </DecalErrorBoundary>
        )}
      </mesh>

      <Sleeve side={-1} long={longSleeves} material={material} trim={trim} />
      <Sleeve side={1} long={longSleeves} material={material} trim={trim} />

      {hoodie ? (
        <>
          <Hood material={material} oversized={s.hoodStyle === 'oversized'} />
          {s.hoodieType === 'zip' ? <ZipFront trim={trim} /> : <KangarooPocket material={material} />}
        </>
      ) : (
        <>
          {s.neckline === 'vneck' && <VNeck trim={trim} />}
          {s.neckline === 'polo' && <PoloCollar material={material} trim={trim} />}
          {s.neckline !== 'vneck' && s.neckline !== 'polo' && <RoundNeck trim={trim} />}
        </>
      )}
    </group>
  );
}
