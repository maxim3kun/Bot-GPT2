import {
  BoxGeometry,
  CanvasTexture,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three';

export interface LiveBedroomScene {
  group: Group;
  keyboardKeys: Mesh[];
  dispose: () => void;
}

function createBedroomBackdrop(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 1520;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Impossible de préparer le décor de la chambre.');

  const wall = context.createLinearGradient(0, 0, 0, canvas.height);
  wall.addColorStop(0, '#5b4c52');
  wall.addColorStop(0.62, '#493f49');
  wall.addColorStop(0.84, '#55464b');
  wall.addColorStop(1, '#302a33');
  context.fillStyle = wall;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = '#e1b58712';
  for (let x = 96; x < canvas.width; x += 180) {
    context.fillRect(x, 0, 2, 1170);
  }
  context.fillStyle = '#caa28b44';
  context.fillRect(0, 1168, canvas.width, 13);
  context.fillStyle = '#322a34';
  context.fillRect(0, 1181, canvas.width, 339);

  // Window, night sky and curtains.
  const windowX = 118;
  const windowY = 245;
  const windowW = 430;
  const windowH = 570;
  context.save();
  context.shadowColor = '#f0b47755';
  context.shadowBlur = 45;
  context.fillStyle = '#c19a84';
  context.fillRect(windowX - 18, windowY - 18, windowW + 36, windowH + 36);
  context.restore();
  const sky = context.createLinearGradient(0, windowY, 0, windowY + windowH);
  sky.addColorStop(0, '#25354e');
  sky.addColorStop(0.56, '#394b5a');
  sky.addColorStop(1, '#6a6b6b');
  context.fillStyle = sky;
  context.fillRect(windowX, windowY, windowW, windowH);
  context.fillStyle = '#f5dfbd';
  context.beginPath();
  context.arc(windowX + windowW * 0.73, windowY + windowH * 0.21, 29, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#283744';
  const buildings = [
    [0.02, 0.74, 0.12, 0.26], [0.17, 0.62, 0.14, 0.38], [0.34, 0.7, 0.12, 0.3],
    [0.49, 0.56, 0.16, 0.44], [0.68, 0.68, 0.1, 0.32], [0.81, 0.58, 0.17, 0.42],
  ];
  for (const [x, y, w, h] of buildings) {
    context.fillRect(windowX + windowW * x, windowY + windowH * y, windowW * w, windowH * h);
  }
  context.fillStyle = '#f4c98c';
  for (let x = 0.08; x < 0.95; x += 0.14) {
    context.fillRect(windowX + windowW * x, windowY + windowH * 0.82, 7, 9);
  }
  context.fillStyle = '#aa8e85';
  context.fillRect(windowX + windowW * 0.48 - 6, windowY, 12, windowH);
  context.fillRect(windowX, windowY + windowH * 0.53 - 6, windowW, 12);
  context.fillRect(windowX - 20, windowY - 20, windowW + 40, 20);
  context.fillRect(windowX - 20, windowY + windowH, windowW + 40, 20);
  context.fillStyle = '#755866';
  context.beginPath();
  context.moveTo(windowX - 44, windowY - 28);
  context.lineTo(windowX + 14, windowY - 22);
  context.lineTo(windowX + 2, windowY + windowH + 20);
  context.lineTo(windowX - 58, windowY + windowH + 10);
  context.closePath();
  context.fill();
  context.beginPath();
  context.moveTo(windowX + windowW + 26, windowY - 24);
  context.lineTo(windowX + windowW + 76, windowY - 30);
  context.lineTo(windowX + windowW + 88, windowY + windowH + 11);
  context.lineTo(windowX + windowW + 22, windowY + windowH + 18);
  context.closePath();
  context.fill();

  // A small shelf with books and a plant makes the room read as lived-in.
  const shelfX = 786;
  const shelfY = 340;
  const shelfW = 365;
  const shelfH = 520;
  context.fillStyle = '#4a3a40';
  context.fillRect(shelfX, shelfY, shelfW, shelfH);
  context.fillStyle = '#917466';
  for (const y of [shelfY, shelfY + shelfH * 0.33, shelfY + shelfH * 0.66, shelfY + shelfH - 12]) {
    context.fillRect(shelfX - 10, y, shelfW + 20, 17);
  }
  const books: Array<[number, number, string]> = [
    [shelfX + 34, 136, '#77887f'], [shelfX + 83, 172, '#b07b6b'],
    [shelfX + 140, 148, '#748093'], [shelfX + 205, 165, '#bd9b76'],
    [shelfX + 267, 123, '#7d8c82'],
  ];
  for (const [x, h, color] of books) {
    context.fillStyle = color;
    context.fillRect(x, shelfY + shelfH * 0.33 - h - 6, 42, h);
    context.fillStyle = '#ffffff2b';
    context.fillRect(x + 7, shelfY + shelfH * 0.33 - h + 8, 3, h - 18);
  }
  context.fillStyle = '#9b7060';
  context.fillRect(shelfX + 268, shelfY + shelfH * 0.66 - 46, 66, 42);
  context.fillStyle = '#76917c';
  for (let i = 0; i < 5; i += 1) {
    context.beginPath();
    context.ellipse(shelfX + 286 + i * 11, shelfY + shelfH * 0.66 - 70 - (i % 2) * 12, 11, 38, (i - 2) * 0.16, 0, Math.PI * 2);
    context.fill();
  }

  // Soft bedside lamp glow and a quiet bed edge near the bottom of frame.
  const lampGlow = context.createRadialGradient(120, 960, 12, 120, 960, 260);
  lampGlow.addColorStop(0, '#f3bc7b47');
  lampGlow.addColorStop(1, '#f3bc7b00');
  context.fillStyle = lampGlow;
  context.fillRect(0, 710, 470, 500);
  context.fillStyle = '#967b6e';
  context.fillRect(58, 1048, 180, 20);
  context.fillRect(92, 992, 112, 62);
  context.fillStyle = '#c6a27e';
  context.beginPath();
  context.moveTo(74, 991);
  context.lineTo(222, 991);
  context.lineTo(200, 936);
  context.lineTo(96, 936);
  context.closePath();
  context.fill();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

export function createLiveBedroomScene(avatarHeight: number): LiveBedroomScene {
  const scale = Math.max(avatarHeight, 0.1);
  const group = new Group();
  const keyboardKeys: Mesh[] = [];
  const backdropTexture = createBedroomBackdrop();

  const makeBox = (
    name: string,
    size: [number, number, number],
    position: [number, number, number],
    color: number,
    options: { emissive?: number; emissiveIntensity?: number; metalness?: number; roughness?: number } = {},
  ) => {
    const material = new MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.78,
      metalness: options.metalness ?? 0.02,
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissiveIntensity ?? 0,
    });
    const mesh = new Mesh(new BoxGeometry(...size), material);
    mesh.name = name;
    mesh.position.set(...position);
    group.add(mesh);
    return mesh;
  };

  const makePlane = (
    name: string,
    width: number,
    height: number,
    position: [number, number, number],
    color: number,
    emissive = 0,
  ) => {
    const material = new MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: emissive ? 0.24 : 0,
      roughness: 0.9,
      metalness: 0,
    });
    const mesh = new Mesh(new PlaneGeometry(width, height), material);
    mesh.name = name;
    mesh.position.set(...position);
    group.add(mesh);
    return mesh;
  };

  const backdrop = new Mesh(
    new PlaneGeometry(2.2 * scale, 2.6 * scale),
    new MeshBasicMaterial({ map: backdropTexture, side: DoubleSide, toneMapped: false }),
  );
  backdrop.name = 'bedroom-backdrop';
  backdrop.position.set(0, 0.72 * scale, -1.25 * scale);
  group.add(backdrop);

  // A light 3D desk sits in front of the avatar; the keyboard establishes the
  // seated-at-home conversation without obscuring the face.
  makeBox('desk-chair-back', [0.82 * scale, 0.78 * scale, 0.16 * scale], [0, 0.77 * scale, -0.2 * scale], 0x243343, {
    metalness: 0.08,
    roughness: 0.48,
  });
  makeBox('desk-chair-headrest', [0.5 * scale, 0.17 * scale, 0.17 * scale], [0, 1.18 * scale, -0.2 * scale], 0x334658, {
    roughness: 0.48,
  });
  makeBox('desk-surface', [2.75 * scale, 0.075 * scale, 0.84 * scale], [0, 0.455 * scale, 0.38 * scale], 0x74564c, {
    roughness: 0.48,
  });
  for (const x of [-1.07, 1.07]) {
    makeBox(`desk-leg-${x}`, [0.08 * scale, 0.45 * scale, 0.08 * scale], [x * scale, 0.22 * scale, 0.45 * scale], 0x493b3b);
  }

  makeBox('keyboard-base', [0.5 * scale, 0.035 * scale, 0.22 * scale], [0, 0.52 * scale, 0.16 * scale], 0x202a37, {
    metalness: 0.14,
    roughness: 0.4,
  });
  const keyColors = [0x647384, 0x738593, 0x536a7b];
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 6; column += 1) {
      const key = makeBox(
        `keyboard-key-${row}-${column}`,
        [0.024 * scale, 0.01 * scale, 0.032 * scale],
        [
          (column - 2.5) * 0.032 * scale,
          0.551 * scale,
          (row - 1) * 0.043 * scale + 0.16 * scale,
        ],
        keyColors[(row + column) % keyColors.length]!,
        { emissive: 0x122d42, emissiveIntensity: 0.1, roughness: 0.36 },
      );
      key.userData.restY = key.position.y;
      keyboardKeys.push(key);
    }
  }

  // A small laptop sits to the side so the face remains unobstructed.
  makeBox('laptop-base', [0.37 * scale, 0.028 * scale, 0.24 * scale], [0.36 * scale, 0.52 * scale, 0.1 * scale], 0x3c4654, {
    metalness: 0.28,
    roughness: 0.36,
  });
  makeBox('laptop-screen-shell', [0.35 * scale, 0.26 * scale, 0.035 * scale], [0.36 * scale, 0.67 * scale, -0.04 * scale], 0x414758, {
    metalness: 0.2,
    roughness: 0.36,
  });
  makePlane('laptop-screen', 0.31 * scale, 0.22 * scale, [0.36 * scale, 0.67 * scale, -0.018 * scale], 0x243f52, 0x146078);

  return {
    group,
    keyboardKeys,
    dispose: () => {
      group.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if (material instanceof MeshBasicMaterial && material.map === backdropTexture) backdropTexture.dispose();
          material.dispose();
        });
      });
    },
  };
}
