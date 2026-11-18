import {
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
} from 'three';

export interface LiveBedroomScene {
  group: Group;
  keyboardKeys: Mesh[];
  dispose: () => void;
}

export const LIVE_BEDROOM_DESK_X_RATIO = 1.38;
export const LIVE_BEDROOM_WINDOW_DISTANCE_RATIO = 0.82;
export const LIVE_BEDROOM_CHAIR_SEAT_HEIGHT_RATIO = 0.42;

export function createLiveBedroomScene(avatarHeight: number, windowX: number): LiveBedroomScene {
  const h = Math.max(avatarHeight, 0.1);
  const group = new Group();
  const keyboardKeys: Mesh[] = [];
  const materials = new Map<number, MeshStandardMaterial>();
  const material = (color: number, roughness = 0.76, extra: { emissive?: number; emissiveIntensity?: number } = {}) => {
    const key = color * 10 + roughness;
    if (!extra.emissive && materials.has(key)) return materials.get(key)!;
    const result = new MeshStandardMaterial({
      color,
      roughness,
      ...extra,
      ...(extra.emissive !== undefined ? { emissive: new Color(extra.emissive) } : {}),
    });
    if (!extra.emissive) materials.set(key, result);
    return result;
  };
  const makeBox = (
    name: string,
    size: [number, number, number],
    position: [number, number, number],
    color: number,
    roughness = 0.76,
    extra: { emissive?: number; emissiveIntensity?: number } = {},
  ) => {
    const mesh = new Mesh(new BoxGeometry(...size), material(color, roughness, extra));
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
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
  const wood = 0x876d59;
  const darkWood = 0x59483e;
  const deskX = LIVE_BEDROOM_DESK_X_RATIO * h;
  const deskY = 0.48 * h;
  // Furniture is kept well behind the avatar plane (z = -0.26h), never in front of it.
  const deskZ = -0.66 * h;

  // Room shell: deliberately open toward the camera so the avatar and furniture remain legible.
  makeBox('bedroom-floor', [roomW, 0.09 * h, roomD], [0, -0.055 * h, -0.02 * h], 0xb9a993, 0.92);
  makeBox('back-wall-left', [Math.max(0.1 * h, windowX + roomW / 2 - winW / 2), wallH, wallT],
    [(-roomW / 2 + (windowX - winW / 2 - (-roomW / 2)) / 2), wallH / 2 - 0.02 * h, wallZ], white);
  makeBox('back-wall-right', [Math.max(0.1 * h, roomW / 2 - (windowX + winW / 2)), wallH, wallT],
    [(windowX + winW / 2 + roomW / 2) / 2, wallH / 2 - 0.02 * h, wallZ], white);
  makeBox('wall-above-window', [winW, Math.max(0.1 * h, wallH - winTop), wallT],
    [windowX, (winTop + wallH) / 2 - 0.02 * h, wallZ], white);
  makeBox('wall-below-window', [winW, winBottom, wallT],
    [windowX, winBottom / 2 - 0.02 * h, wallZ], white);
  makeBox('left-side-wall', [wallT, wallH, roomD], [-roomW / 2, wallH / 2 - 0.02 * h, -0.02 * h], 0xe7e5df);
  makeBox('right-side-wall', [wallT, wallH, roomD], [roomW / 2, wallH / 2 - 0.02 * h, -0.02 * h], 0xe7e5df);
  makeBox('ceiling', [roomW, 0.055 * h, roomD], [0, wallH, -0.02 * h], 0xf6f5f1);
  makeBox('skirting-board', [roomW, 0.09 * h, 0.055 * h], [0, 0.045 * h, wallZ + 0.07 * h], 0xd6d1c8);

  // Recessed window, frame, muntins and a quiet evening view.
  makeBox('window-night-glass', [winW - 0.08 * h, winH - 0.08 * h, 0.025 * h],
    [windowX, winY, wallZ + 0.12 * h], 0x667c8a, 0.25, { emissive: 0x273c4a, emissiveIntensity: 0.55 });
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
  // Low skyline and moon discs built from simple geometry.
  makeBox('distant-rooftops', [winW - 0.12 * h, 0.2 * h, 0.018 * h],
    [windowX, winBottom + 0.11 * h, wallZ + 0.15 * h], 0x354955, 0.9);
  for (let i = 0; i < 5; i += 1) {
    makeBox(`distant-building-${i}`, [0.09 * h, (0.12 + (i % 3) * 0.055) * h, 0.022 * h],
      [windowX - 0.29 * h + i * 0.14 * h, winBottom + (0.11 + (i % 3) * 0.027) * h, wallZ + 0.15 * h], 0x41545e);
  }
  makeBox('window-moon', [0.09 * h, 0.09 * h, 0.018 * h],
    [windowX + 0.22 * h, winY + 0.24 * h, wallZ + 0.15 * h], 0xf0d5a3, 0.36,
    { emissive: 0xd7a967, emissiveIntensity: 0.55 });

  // Folded curtains with layered fabric depth and a visible rail.
  makeBox('curtain-rail', [winW + 0.34 * h, 0.045 * h, 0.06 * h],
    [windowX, winTop + 0.11 * h, wallZ + 0.18 * h], darkWood);
  for (const side of [-1, 1]) {
    const cx = windowX + side * (winW * 0.43);
    for (let pleat = 0; pleat < 3; pleat += 1) {
      makeBox(`curtain-${side}-${pleat}`, [0.105 * h, winH + 0.2 * h, 0.09 * h],
        [cx + side * pleat * 0.065 * h, winY - 0.04 * h, wallZ + 0.21 * h],
        pleat === 1 ? 0x927b78 : 0x806c6b, 0.96);
    }
  }

  // Compact desk and chair sit to the right of the avatar's clear desk-to-window lane.
  makeBox('desk-top', [0.58 * h, 0.06 * h, 0.32 * h], [deskX, deskY, deskZ], wood, 0.52);
  makeBox('desk-apron', [0.48 * h, 0.1 * h, 0.26 * h], [deskX, deskY - 0.08 * h, deskZ], darkWood);
  for (const x of [-0.23, 0.23]) {
    for (const z of [-0.11, 0.11]) {
      makeBox(`desk-leg-${x}-${z}`, [0.035 * h, 0.39 * h, 0.035 * h], [deskX + x * h, 0.2 * h, deskZ + z * h], darkWood);
    }
  }
  // A compact upholstered chair sits in front of the desk, with its back toward the room.
  const chairX = deskX;
  const chairZ = -0.22 * h;
  const chairSeatY = LIVE_BEDROOM_CHAIR_SEAT_HEIGHT_RATIO * h;
  const chairFabric = 0x71807d;
  makeBox('desk-chair-seat', [0.43 * h, 0.055 * h, 0.38 * h],
    [chairX, chairSeatY, chairZ], chairFabric, 0.92);
  makeBox('desk-chair-back', [0.4 * h, 0.22 * h, 0.07 * h],
    [chairX, chairSeatY + 0.13 * h, chairZ - 0.17 * h], chairFabric, 0.92);
  for (const x of [-0.17, 0.17]) {
    for (const z of [-0.14, 0.14]) {
      makeBox(`desk-chair-leg-${x}-${z}`, [0.035 * h, 0.4 * h, 0.035 * h],
        [chairX + x * h, 0.205 * h, chairZ + z * h], darkWood);
    }
  }
  for (const x of [-0.18, 0.18]) {
    makeBox(`desk-chair-support-${x}`, [0.035 * h, 0.045 * h, 0.035 * h],
      [chairX + x * h, chairSeatY + 0.045 * h, chairZ + 0.17 * h], darkWood);
  }
  makeBox('keyboard-base', [0.25 * h, 0.02 * h, 0.085 * h], [deskX, deskY + 0.04 * h, deskZ + 0.075 * h], 0x333a3b, 0.42);
  const keyColors = [0xb9b4a8, 0xc7c0b3, 0x9faaa7];
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 6; column += 1) {
      const key = makeBox(`keyboard-key-${row}-${column}`, [0.025 * h, 0.008 * h, 0.019 * h],
        [deskX + (column - 2.5) * 0.035 * h, deskY + 0.055 * h, deskZ + (row - 1) * 0.025 * h + 0.075 * h],
        keyColors[(row + column) % keyColors.length]!, 0.38);
      key.userData.restY = key.position.y;
      keyboardKeys.push(key);
    }
  }
  makeBox('desk-monitor-base', [0.18 * h, 0.02 * h, 0.09 * h], [deskX, deskY + 0.045 * h, deskZ - 0.1 * h], darkWood);
  makeBox('desk-monitor-stand', [0.025 * h, 0.11 * h, 0.025 * h], [deskX, deskY + 0.105 * h, deskZ - 0.11 * h], 0x555958);
  makeBox('desk-monitor', [0.31 * h, 0.2 * h, 0.035 * h], [deskX, deskY + 0.21 * h, deskZ - 0.12 * h], 0x34424a, 0.3);
  makeBox('monitor-screen', [0.28 * h, 0.17 * h, 0.008 * h], [deskX, deskY + 0.21 * h, deskZ - 0.099 * h],
    0x728a8e, 0.25, { emissive: 0x243c3f, emissiveIntensity: 0.25 });

  // Warm, three-dimensional desk lamp.
  makeBox('lamp-base', [0.12 * h, 0.025 * h, 0.1 * h], [deskX + 0.19 * h, deskY + 0.045 * h, deskZ], darkWood);
  makeBox('lamp-stem', [0.025 * h, 0.17 * h, 0.025 * h], [deskX + 0.19 * h, deskY + 0.13 * h, deskZ], 0x88725f);
  makeBox('lamp-shade', [0.14 * h, 0.085 * h, 0.13 * h], [deskX + 0.19 * h, deskY + 0.25 * h, deskZ], 0xd6b883, 0.48,
    { emissive: 0xb77a38, emissiveIntensity: 0.32 });

  // Bookshelf and objects on the far wall, outside the walking corridor.
  const shelfX = windowX - 1.35 * h;
  const shelfZ = -0.61 * h;
  makeBox('bookcase-back', [0.74 * h, 1.28 * h, 0.075 * h], [shelfX, 0.66 * h, shelfZ], 0x76604e);
  for (const y of [0.06, 0.46, 0.86, 1.25]) {
    makeBox(`bookcase-shelf-${y}`, [0.82 * h, 0.06 * h, 0.34 * h], [shelfX, y * h, shelfZ + 0.16 * h], wood);
  }
  for (let shelf = 0; shelf < 3; shelf += 1) {
    for (let book = 0; book < 5; book += 1) {
      const colors = [0x697c76, 0xb27e68, 0x647a86, 0xb5a17f, 0x8e6e70];
      const bh = (0.19 + (book % 2) * 0.07) * h;
      makeBox(`book-${shelf}-${book}`, [0.075 * h, bh, 0.17 * h],
        [shelfX - 0.29 * h + book * 0.13 * h, (0.07 + shelf * 0.4) * h + bh / 2, shelfZ + 0.16 * h],
        colors[(book + shelf) % colors.length]!);
    }
  }

  // A low bed anchors the room as a bedroom; it sits to the side and behind the walk lane.
  const bedX = windowX - 0.82 * h;
  const bedZ = -0.61 * h;
  makeBox('bed-frame', [1.02 * h, 0.18 * h, 0.62 * h], [bedX, 0.13 * h, bedZ], 0x76675f);
  makeBox('bed-mattress', [1.0 * h, 0.15 * h, 0.6 * h], [bedX, 0.25 * h, bedZ], 0xd9d5cc, 0.94);
  makeBox('bed-cover', [0.67 * h, 0.045 * h, 0.57 * h], [bedX + 0.16 * h, 0.34 * h, bedZ + 0.015 * h], 0x829293, 0.95);
  makeBox('bed-pillow', [0.31 * h, 0.08 * h, 0.22 * h], [bedX - 0.3 * h, 0.36 * h, bedZ + 0.11 * h], 0xede8de, 0.96);
  makeBox('bed-headboard', [1.08 * h, 0.48 * h, 0.07 * h], [bedX, 0.39 * h, bedZ - 0.33 * h], 0x89796d);

  // A restrained rug marks the walk line without obstructing it.
  makeBox('bedroom-rug', [1.05 * h, 0.018 * h, 0.72 * h], [windowX + 0.38 * h, 0.005 * h, -0.36 * h], 0xc9bba8, 0.97);
  makeBox('rug-center', [0.78 * h, 0.004 * h, 0.48 * h], [windowX + 0.38 * h, 0.016 * h, -0.36 * h], 0xd8caba, 0.97);

  return {
    group,
    keyboardKeys,
    dispose: () => {
      group.traverse((object) => {
        if (object instanceof Mesh) object.geometry.dispose();
      });
      materials.forEach((item) => item.dispose());
      materials.clear();
    },
  };
}
