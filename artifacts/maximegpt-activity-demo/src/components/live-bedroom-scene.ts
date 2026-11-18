import {
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  MeshBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  SphereGeometry,
  Texture,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export interface LiveBedroomScene {
  group: Group;
  keyboardKeys: Mesh[];
  avatarShadow: Mesh;
  dispose: () => void;
}

export const LIVE_BEDROOM_DESK_X_RATIO = 1.38;
export const LIVE_BEDROOM_WINDOW_DISTANCE_RATIO = 0.82;
export const LIVE_BEDROOM_CHAIR_Z_RATIO = -0.26;
export const LIVE_BEDROOM_WINDOW_APPROACH_Z_RATIO = -0.72;
export const LIVE_BEDROOM_CHAIR_SEAT_HEIGHT_RATIO = 0.42;

export function createLiveBedroomScene(avatarHeight: number, windowX: number): LiveBedroomScene {
  const h = Math.max(avatarHeight, 0.1);
  const group = new Group();
  const keyboardKeys: Mesh[] = [];
  const materials = new Set<MeshStandardMaterial | MeshBasicMaterial>();
  const textures = new Set<Texture>();
  const materialCache = new Map<string, MeshStandardMaterial>();
  const createTexture = (
    draw: (context: CanvasRenderingContext2D, size: number) => void,
    repeat: [number, number],
  ) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (context) draw(context, canvas.width);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(...repeat);
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    textures.add(texture);
    return texture;
  };
  const woodTexture = createTexture((context, size) => {
    const base = context.createLinearGradient(0, 0, size, size);
    base.addColorStop(0, '#bd9a73');
    base.addColorStop(0.5, '#a98560');
    base.addColorStop(1, '#c5a17a');
    context.fillStyle = base;
    context.fillRect(0, 0, size, size);
    for (let line = 0; line < 78; line += 1) {
      const y = line * 6.6;
      context.strokeStyle = line % 5 === 0 ? '#805f43aa' : '#e4c49a55';
      context.lineWidth = line % 5 === 0 ? 1.5 : 0.8;
      context.beginPath();
      context.moveTo(0, y);
      context.bezierCurveTo(size * 0.3, y + Math.sin(line) * 4, size * 0.7, y - Math.cos(line) * 4, size, y + Math.sin(line * 0.4) * 3);
      context.stroke();
    }
    for (let knot = 0; knot < 8; knot += 1) {
      const x = (knot * 83 + 41) % size;
      const y = (knot * 137 + 63) % size;
      context.strokeStyle = '#76553755';
      context.lineWidth = 1;
      context.beginPath();
      context.ellipse(x, y, 17, 5, 0.04, 0, Math.PI * 2);
      context.stroke();
    }
  }, [2.6, 1.8]);
  const wallTexture = createTexture((context, size) => {
    const wall = context.createLinearGradient(0, 0, size, size);
    wall.addColorStop(0, '#f8f4ec');
    wall.addColorStop(1, '#eae3d9');
    context.fillStyle = wall;
    context.fillRect(0, 0, size, size);
    for (let i = 0; i < 2_800; i += 1) {
      const x = (i * 167 + 31) % size;
      const y = (i * 293 + 79) % size;
      context.fillStyle = i % 2 ? '#ffffff20' : '#b9a99813';
      context.fillRect(x, y, 1 + (i % 3), 1 + (i % 2));
    }
  }, [1, 1]);
  const fabricTexture = createTexture((context, size) => {
    context.fillStyle = '#8e9e9c';
    context.fillRect(0, 0, size, size);
    for (let line = 0; line < size; line += 4) {
      context.strokeStyle = line % 8 === 0 ? '#e9eeea36' : '#243b3922';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, line);
      context.lineTo(size, line + 2);
      context.stroke();
      context.beginPath();
      context.moveTo(line, 0);
      context.lineTo(line + 2, size);
      context.stroke();
    }
  }, [1, 1]);
  const rugTexture = createTexture((context, size) => {
    context.fillStyle = '#d2c4ae';
    context.fillRect(0, 0, size, size);
    context.strokeStyle = '#a89173';
    context.lineWidth = 2;
    for (let y = -size; y < size * 2; y += 36) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(size, y + size);
      context.stroke();
      context.beginPath();
      context.moveTo(size, y);
      context.lineTo(0, y + size);
      context.stroke();
    }
  }, [2, 1.5]);
  const artworkTexture = createTexture((context, size) => {
    const sky = context.createLinearGradient(0, 0, 0, size);
    sky.addColorStop(0, '#354d69');
    sky.addColorStop(0.6, '#889eb0');
    sky.addColorStop(1, '#e3b58b');
    context.fillStyle = sky;
    context.fillRect(0, 0, size, size);
    context.fillStyle = '#26374b';
    for (let i = 0; i < 9; i += 1) {
      const x = i * 61;
      const height = 70 + (i * 37) % 130;
      context.fillRect(x, size - height, 35, height);
      context.fillStyle = '#e8c887';
      for (let row = 0; row < 4; row += 1) context.fillRect(x + 8, size - height + 12 + row * 22, 5, 7);
      context.fillStyle = '#26374b';
    }
    context.fillStyle = '#f4dba5';
    context.beginPath();
    context.arc(size * 0.78, size * 0.22, 40, 0, Math.PI * 2);
    context.fill();
  }, [1, 1]);
  const material = (
    color: number,
    roughness = 0.76,
    extra: { emissive?: number; emissiveIntensity?: number; map?: Texture } = {},
  ) => {
    const key = `${color}-${roughness}-${extra.emissive ?? 0}-${extra.map ? [...textures].indexOf(extra.map) : 0}`;
    if (materialCache.has(key)) return materialCache.get(key)!;
    const { map, ...materialOptions } = extra;
    const result = new MeshStandardMaterial({
      color,
      roughness,
      ...(map ? { map } : {}),
      ...materialOptions,
      ...(extra.emissive !== undefined ? { emissive: new Color(extra.emissive) } : {}),
    });
    materialCache.set(key, result);
    materials.add(result);
    return result;
  };
  const makeBox = (
    name: string,
    size: [number, number, number],
    position: [number, number, number],
    color: number,
    roughness = 0.76,
    extra: { emissive?: number; emissiveIntensity?: number } = {},
    texture?: Texture,
  ) => {
    const mesh = new Mesh(
      new BoxGeometry(...size),
      material(color, roughness, { ...extra, ...(texture ? { map: texture } : {}) }),
    );
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const makeRoundedBox = (
    name: string,
    size: [number, number, number],
    position: [number, number, number],
    color: number,
    roughness = 0.76,
    radius = 0.025 * h,
    texture?: Texture,
  ) => {
    const mesh = new Mesh(
      new RoundedBoxGeometry(...size, 3, radius),
      material(color, roughness, texture ? { map: texture } : {}),
    );
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const makeCylinder = (
    name: string,
    radiusTop: number,
    radiusBottom: number,
    height: number,
    position: [number, number, number],
    color: number,
    segments = 20,
  ) => {
    const mesh = new Mesh(
      new CylinderGeometry(radiusTop, radiusBottom, height, segments),
      material(color, 0.74),
    );
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const makeSphere = (
    name: string,
    size: [number, number, number],
    position: [number, number, number],
    color: number,
    roughness = 0.8,
  ) => {
    const mesh = new Mesh(
      new SphereGeometry(1, 18, 14),
      material(color, roughness),
    );
    mesh.name = name;
    mesh.scale.set(...size);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  const roomW = 4.8 * h;
  const roomD = 2.8 * h;
  const wallZ = -0.92 * h;
  const wallH = 2.55 * h;
  const wallT = 0.09 * h;
  const winW = 0.88 * h;
  const winH = 0.82 * h;
  // Lower the aperture into the camera's actual vertical field of view at the back wall.
  const winY = 0.84 * h;
  const winBottom = winY - winH / 2;
  const winTop = winY + winH / 2;
  const white = 0xf1f0eb;
  const trim = 0xd8d3c9;
  const darkWood = 0x59483e;
  const deskX = LIVE_BEDROOM_DESK_X_RATIO * h;
  const deskY = 0.48 * h;
  // Keep the desk beside and slightly behind the avatar so it never hides the body.
  const deskZ = -0.52 * h;

  // Open-front room with warm, subtly textured surfaces.
  makeBox('bedroom-floor', [roomW, 0.09 * h, roomD], [0, -0.055 * h, -0.02 * h], 0xffffff, 0.88, {}, woodTexture);
  makeBox('back-wall-left', [Math.max(0.1 * h, windowX + roomW / 2 - winW / 2), wallH, wallT],
    [(-roomW / 2 + (windowX - winW / 2 - (-roomW / 2)) / 2), wallH / 2 - 0.02 * h, wallZ], white, 0.94, {}, wallTexture);
  makeBox('back-wall-right', [Math.max(0.1 * h, roomW / 2 - (windowX + winW / 2)), wallH, wallT],
    [(windowX + winW / 2 + roomW / 2) / 2, wallH / 2 - 0.02 * h, wallZ], white, 0.94, {}, wallTexture);
  makeBox('wall-above-window', [winW, Math.max(0.1 * h, wallH - winTop), wallT],
    [windowX, (winTop + wallH) / 2 - 0.02 * h, wallZ], white, 0.94, {}, wallTexture);
  makeBox('wall-below-window', [winW, winBottom, wallT],
    [windowX, winBottom / 2 - 0.02 * h, wallZ], white, 0.94, {}, wallTexture);
  makeBox('left-side-wall', [wallT, wallH, roomD], [-roomW / 2, wallH / 2 - 0.02 * h, -0.02 * h], 0xece8e1, 0.94, {}, wallTexture);
  makeBox('right-side-wall', [wallT, wallH, roomD], [roomW / 2, wallH / 2 - 0.02 * h, -0.02 * h], 0xece8e1, 0.94, {}, wallTexture);
  makeBox('ceiling', [roomW, 0.055 * h, roomD], [0, wallH, -0.02 * h], 0xf6f5f1, 0.96, {}, wallTexture);
  makeRoundedBox('skirting-board', [roomW, 0.085 * h, 0.06 * h], [0, 0.035 * h, wallZ + 0.07 * h], 0xe3ddd2, 0.85, 0.018 * h);
  for (const offset of [-0.68, 0.68]) {
    makeRoundedBox(
      `wall-panel-${offset}`,
      [0.025 * h, 0.68 * h, 0.018 * h],
      [windowX + offset * h, 0.63 * h, wallZ + 0.055 * h],
      0xeae4da,
      0.9,
      0.025 * h,
      wallTexture,
    );
  }

  // Recessed window, frame, muntins and a quiet evening view.
  makeBox('window-night-glass', [winW - 0.08 * h, winH - 0.08 * h, 0.025 * h],
    [windowX, winY, wallZ + 0.12 * h], 0xffffff, 0.28, { emissive: 0x273c4a, emissiveIntensity: 0.28 }, artworkTexture);
  for (const [name, size, pos] of [
    ['window-frame-top', [winW + 0.08 * h, 0.075 * h, 0.1 * h], [windowX, winTop, wallZ + 0.13 * h]],
    ['window-frame-bottom', [winW + 0.08 * h, 0.08 * h, 0.11 * h], [windowX, winBottom, wallZ + 0.13 * h]],
    ['window-frame-left', [0.075 * h, winH, 0.1 * h], [windowX - winW / 2, winY, wallZ + 0.13 * h]],
    ['window-frame-right', [0.075 * h, winH, 0.1 * h], [windowX + winW / 2, winY, wallZ + 0.13 * h]],
    ['window-mullion-v', [0.03 * h, winH - 0.05 * h, 0.07 * h], [windowX, winY, wallZ + 0.14 * h]],
    ['window-mullion-h', [winW - 0.05 * h, 0.03 * h, 0.07 * h], [windowX, winY, wallZ + 0.14 * h]],
  ] as [string, [number, number, number], [number, number, number]][]) {
    makeBox(name, size, pos, trim);
  }
  // Rounded curtain rail and layered cloth panels frame a softly lit night view.
  makeCylinder('curtain-rail', 0.018 * h, 0.018 * h, winW + 0.34 * h,
    [windowX, winTop + 0.11 * h, wallZ + 0.18 * h], darkWood, 18).rotation.z = Math.PI / 2;
  for (const side of [-1, 1]) {
    const cx = windowX + side * (winW * 0.43);
    for (let pleat = 0; pleat < 4; pleat += 1) {
      const panel = makeRoundedBox(
        `curtain-${side}-${pleat}`,
        [0.075 * h, winH + 0.16 * h, 0.055 * h],
        [cx + side * pleat * 0.052 * h, winY - 0.04 * h, wallZ + 0.21 * h],
        pleat % 2 ? 0x9b8582 : 0x867574,
        0.98,
        0.025 * h,
        fabricTexture,
      );
      panel.rotation.z = Math.sin(pleat * 1.4) * 0.025;
    }
  }
  const artworkFrame = makeRoundedBox(
    'bedroom-art-frame',
    [0.42 * h, 0.52 * h, 0.045 * h],
    [windowX, 1.68 * h, wallZ + 0.09 * h],
    0xffffff,
    0.7,
    0.035 * h,
    woodTexture,
  );
  artworkFrame.rotation.y = -0.04;
  makeBox('bedroom-artwork', [0.35 * h, 0.45 * h, 0.008 * h],
    [windowX, 1.68 * h, wallZ + 0.125 * h], 0xffffff, 0.85, {}, artworkTexture);

  // Rounded oak desktop with a slim front edge and discreet drawers.
  makeRoundedBox('desk-top', [0.78 * h, 0.055 * h, 0.34 * h], [deskX, deskY, deskZ], 0xffffff, 0.58, 0.035 * h, woodTexture);
  makeRoundedBox('desk-apron', [0.66 * h, 0.09 * h, 0.25 * h], [deskX, deskY - 0.085 * h, deskZ], darkWood, 0.7, 0.018 * h);
  for (const x of [-0.29, 0.29]) {
    for (const z of [-0.11, 0.11]) {
      makeRoundedBox(`desk-leg-${x}-${z}`, [0.032 * h, 0.39 * h, 0.032 * h], [deskX + x * h, 0.2 * h, deskZ + z * h], darkWood, 0.72, 0.012 * h);
    }
  }
  for (const side of [-1, 1]) {
    makeRoundedBox(`desk-drawer-${side}`, [0.22 * h, 0.105 * h, 0.24 * h],
      [deskX + side * 0.23 * h, deskY - 0.12 * h, deskZ + 0.035 * h], 0xffffff, 0.65, 0.012 * h, woodTexture);
    makeCylinder(`drawer-pull-${side}`, 0.008 * h, 0.008 * h, 0.05 * h,
      [deskX + side * 0.23 * h, deskY - 0.12 * h, deskZ + 0.16 * h], 0xc2a66e, 10).rotation.z = Math.PI / 2;
  }
  // Smaller upholstered chair set back from the avatar so its silhouette remains clear.
  const chairX = deskX - 0.48 * h;
  const chairZ = LIVE_BEDROOM_CHAIR_Z_RATIO * h;
  const chairSeatY = LIVE_BEDROOM_CHAIR_SEAT_HEIGHT_RATIO * h;
  const chairFabric = 0x71807d;
  makeRoundedBox('desk-chair-seat', [0.27 * h, 0.05 * h, 0.25 * h],
    [chairX, chairSeatY, chairZ], chairFabric, 0.95, 0.045 * h, fabricTexture);
  makeCylinder('desk-chair-post', 0.035 * h, 0.045 * h, 0.2 * h,
    [chairX, 0.3 * h, chairZ], 0x555a5d, 18);
  makeCylinder('desk-chair-base', 0.11 * h, 0.11 * h, 0.035 * h,
    [chairX, 0.13 * h, chairZ], 0x555a5d, 20);
  for (let spoke = 0; spoke < 5; spoke += 1) {
    const angle = spoke * Math.PI * 2 / 5;
    const x = Math.sin(angle);
    const z = Math.cos(angle);
    const bar = makeRoundedBox(
      `desk-chair-spoke-${spoke}`,
      [0.02 * h, 0.02 * h, 0.2 * h],
      [chairX + x * 0.085 * h, 0.13 * h, chairZ + z * 0.085 * h],
      0x555a5d,
      0.6,
      0.01 * h,
    );
    bar.rotation.y = angle;
    makeSphere(`desk-chair-caster-${spoke}`, [0.018 * h, 0.014 * h, 0.018 * h],
      [chairX + x * 0.18 * h, 0.05 * h, chairZ + z * 0.18 * h], 0x62696a, 0.48);
  }
  const keyboardX = deskX - 0.22 * h;
  makeRoundedBox('keyboard-base', [0.25 * h, 0.02 * h, 0.085 * h], [keyboardX, deskY + 0.04 * h, deskZ + 0.075 * h], 0x333a3b, 0.42, 0.012 * h);
  const keyColors = [0xb9b4a8, 0xc7c0b3, 0x9faaa7];
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 6; column += 1) {
      const key = makeRoundedBox(`keyboard-key-${row}-${column}`, [0.025 * h, 0.008 * h, 0.019 * h],
        [keyboardX + (column - 2.5) * 0.035 * h, deskY + 0.055 * h, deskZ + (row - 1) * 0.025 * h + 0.075 * h],
        keyColors[(row + column) % keyColors.length]!, 0.38, 0.004 * h);
      key.userData.restY = key.position.y;
      keyboardKeys.push(key);
    }
  }
  const monitorX = deskX + 0.23 * h;
  makeRoundedBox('desk-monitor-base', [0.18 * h, 0.02 * h, 0.09 * h], [monitorX, deskY + 0.045 * h, deskZ - 0.1 * h], darkWood, 0.7, 0.01 * h);
  makeRoundedBox('desk-monitor-stand', [0.025 * h, 0.11 * h, 0.025 * h], [monitorX, deskY + 0.105 * h, deskZ - 0.11 * h], 0x555958, 0.55, 0.009 * h);
  makeRoundedBox('desk-monitor', [0.28 * h, 0.18 * h, 0.035 * h], [monitorX, deskY + 0.21 * h, deskZ - 0.12 * h], 0x242b31, 0.3, 0.018 * h);
  const monitorGlow = new MeshBasicMaterial({ color: 0x9dbbc2 });
  materials.add(monitorGlow);
  const monitorScreen = new Mesh(new PlaneGeometry(0.25 * h, 0.15 * h), monitorGlow);
  monitorScreen.name = 'monitor-screen';
  monitorScreen.position.set(monitorX, deskY + 0.21 * h, deskZ - 0.098 * h);
  group.add(monitorScreen);

  // Desk objects add visible material contrast without crowding the working surface.
  makeRoundedBox('lamp-base', [0.12 * h, 0.025 * h, 0.1 * h], [deskX - 0.29 * h, deskY + 0.045 * h, deskZ], darkWood, 0.52, 0.012 * h);
  makeCylinder('lamp-stem', 0.012 * h, 0.02 * h, 0.17 * h,
    [deskX - 0.29 * h, deskY + 0.13 * h, deskZ], 0x9a8067, 14);
  makeCylinder('lamp-shade', 0.04 * h, 0.085 * h, 0.09 * h,
    [deskX - 0.29 * h, deskY + 0.25 * h, deskZ], 0xe5c890, 20);
  makeCylinder('desk-plant-pot', 0.055 * h, 0.045 * h, 0.075 * h,
    [deskX - 0.2 * h, deskY + 0.085 * h, deskZ], 0xd59b78, 16);
  for (let leaf = 0; leaf < 5; leaf += 1) {
    const angle = leaf * Math.PI * 0.4;
    const sprout = makeSphere(
      `desk-plant-leaf-${leaf}`,
      [0.018 * h, 0.08 * h, 0.026 * h],
      [deskX - 0.2 * h + Math.cos(angle) * 0.028 * h, deskY + 0.15 * h, deskZ + Math.sin(angle) * 0.028 * h],
      leaf % 2 ? 0x62806c : 0x789076,
      0.88,
    );
    sprout.rotation.z = Math.cos(angle) * 0.35;
    sprout.rotation.x = Math.sin(angle) * 0.3;
  }

  // Bookshelf and objects on the far wall, outside the walking corridor.
  const shelfX = windowX - 1.35 * h;
  const shelfZ = -0.61 * h;
  makeRoundedBox('bookcase-back', [0.74 * h, 1.28 * h, 0.075 * h], [shelfX, 0.66 * h, shelfZ], 0xffffff, 0.78, 0.02 * h, woodTexture);
  for (const y of [0.06, 0.46, 0.86, 1.25]) {
    makeRoundedBox(`bookcase-shelf-${y}`, [0.82 * h, 0.06 * h, 0.34 * h], [shelfX, y * h, shelfZ + 0.16 * h], 0xffffff, 0.68, 0.018 * h, woodTexture);
  }
  for (let shelf = 0; shelf < 3; shelf += 1) {
    for (let book = 0; book < 5; book += 1) {
      const colors = [0x697c76, 0xb27e68, 0x647a86, 0xb5a17f, 0x8e6e70];
      const bh = (0.19 + (book % 2) * 0.07) * h;
      makeRoundedBox(`book-${shelf}-${book}`, [0.075 * h, bh, 0.17 * h],
        [shelfX - 0.29 * h + book * 0.13 * h, (0.07 + shelf * 0.4) * h + bh / 2, shelfZ + 0.16 * h],
        colors[(book + shelf) % colors.length]!, 0.82, 0.008 * h);
    }
  }

  // A low bed anchors the room as a bedroom; it sits to the side and behind the walk lane.
  const bedX = windowX - 0.82 * h;
  const bedZ = -0.61 * h;
  makeRoundedBox('bed-frame', [1.02 * h, 0.18 * h, 0.62 * h], [bedX, 0.13 * h, bedZ], 0x76675f, 0.82, 0.035 * h);
  makeRoundedBox('bed-mattress', [1.0 * h, 0.15 * h, 0.6 * h], [bedX, 0.25 * h, bedZ], 0xf0ede6, 0.98, 0.05 * h, fabricTexture);
  makeRoundedBox('bed-cover', [0.67 * h, 0.045 * h, 0.57 * h], [bedX + 0.16 * h, 0.34 * h, bedZ + 0.015 * h], 0x829293, 0.96, 0.028 * h, fabricTexture);
  makeRoundedBox('bed-pillow', [0.31 * h, 0.08 * h, 0.22 * h], [bedX - 0.3 * h, 0.36 * h, bedZ + 0.11 * h], 0xede8de, 0.98, 0.035 * h, fabricTexture);
  makeRoundedBox('bed-headboard', [1.08 * h, 0.48 * h, 0.07 * h], [bedX, 0.39 * h, bedZ - 0.33 * h], 0x89796d, 0.82, 0.035 * h, fabricTexture);

  // Textured rug under the route and a soft contact shadow that follows Maxime.
  makeRoundedBox('bedroom-rug', [1.12 * h, 0.018 * h, 0.82 * h],
    [windowX + 0.38 * h, 0.005 * h, -0.36 * h], 0xffffff, 0.99, 0.018 * h, rugTexture);
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 256;
  shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext('2d');
  if (shadowContext) {
    const gradient = shadowContext.createRadialGradient(128, 64, 7, 128, 64, 64);
    gradient.addColorStop(0, 'rgba(27, 31, 38, 0.34)');
    gradient.addColorStop(0.52, 'rgba(27, 31, 38, 0.17)');
    gradient.addColorStop(1, 'rgba(27, 31, 38, 0)');
    shadowContext.fillStyle = gradient;
    shadowContext.fillRect(0, 0, 256, 128);
  }
  const shadowTexture = new CanvasTexture(shadowCanvas);
  shadowTexture.colorSpace = SRGBColorSpace;
  textures.add(shadowTexture);
  const shadowMaterial = new MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
  materials.add(shadowMaterial);
  const avatarShadow = new Mesh(new PlaneGeometry(0.78 * h, 0.34 * h), shadowMaterial);
  avatarShadow.name = 'avatar-contact-shadow';
  avatarShadow.rotation.x = -Math.PI / 2;
  avatarShadow.position.set(deskX - 0.48 * h, 0.003 * h, -0.26 * h);
  avatarShadow.renderOrder = 1;
  group.add(avatarShadow);

  return {
    group,
    keyboardKeys,
    avatarShadow,
    dispose: () => {
      group.traverse((object) => {
        if (object instanceof Mesh) object.geometry.dispose();
      });
      materials.forEach((item) => item.dispose());
      textures.forEach((item) => item.dispose());
      materialCache.clear();
    },
  };
}
