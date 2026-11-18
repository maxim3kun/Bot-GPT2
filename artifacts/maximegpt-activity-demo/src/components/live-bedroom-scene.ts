import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
} from 'three';

export interface LiveBedroomScene {
  group: Group;
  keyboardKeys: Mesh[];
  dispose: () => void;
}

export function createLiveBedroomScene(avatarHeight: number): LiveBedroomScene {
  const scale = Math.max(avatarHeight, 0.1);
  const group = new Group();
  const keyboardKeys: Mesh[] = [];

  const makeBox = (
    name: string,
    size: [number, number, number],
    position: [number, number, number],
    color: number,
    roughness = 0.7,
  ) => {
    const material = new MeshStandardMaterial({ color, roughness });
    const mesh = new Mesh(new BoxGeometry(...size), material);
    mesh.name = name;
    mesh.position.set(...position);
    group.add(mesh);
    return mesh;
  };

  // Desk and keyboard give the portrait a seated, at-home context.
  makeBox('desk-top', [2.35 * scale, 0.045 * scale, 0.62 * scale], [0, 0.43 * scale, 0.34 * scale], 0x71544b, 0.52);
  for (const x of [-0.93, 0.93]) {
    makeBox(`desk-leg-${x}`, [0.07 * scale, 0.42 * scale, 0.07 * scale], [x * scale, 0.21 * scale, 0.42 * scale], 0x473a3b, 0.6);
  }

  makeBox('keyboard-base', [0.34 * scale, 0.022 * scale, 0.15 * scale], [0, 0.464 * scale, 0.13 * scale], 0x252c35, 0.42);
  const keyColors = [0x87939a, 0x74838c, 0x9b9a91];
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 6; column += 1) {
      const key = makeBox(
        `keyboard-key-${row}-${column}`,
        [0.031 * scale, 0.009 * scale, 0.027 * scale],
        [
          (column - 2.5) * 0.044 * scale,
          0.48 * scale,
          (row - 1) * 0.037 * scale + 0.13 * scale,
        ],
        keyColors[(row + column) % keyColors.length]!,
        0.38,
      );
      key.userData.restY = key.position.y;
      keyboardKeys.push(key);
    }
  }

  return {
    group,
    keyboardKeys,
    dispose: () => {
      group.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
    },
  };
}
