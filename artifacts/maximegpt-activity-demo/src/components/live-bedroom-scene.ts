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
  const deskX = 1.2 * scale;

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

  // A small rug marks the clear walking path between the desk and the window.
  makeBox('bedroom-rug', [0.82 * scale, 0.018 * scale, 0.68 * scale], [0.72 * scale, 0.009 * scale, -0.5 * scale], 0xd9cec2, 0.92);

  // Keep the desk to the right so it never blocks the walking avatar.
  makeBox('desk-top', [0.32 * scale, 0.045 * scale, 0.3 * scale], [deskX, 0.43 * scale, 0.05 * scale], 0x71544b, 0.52);
  for (const x of [-0.12, 0.12]) {
    makeBox(`desk-leg-${x}`, [0.06 * scale, 0.42 * scale, 0.06 * scale], [deskX + x * scale, 0.21 * scale, 0.13 * scale], 0x473a3b, 0.6);
  }

  makeBox('keyboard-base', [0.28 * scale, 0.022 * scale, 0.12 * scale], [deskX, 0.464 * scale, 0.08 * scale], 0x252c35, 0.42);
  const keyColors = [0x87939a, 0x74838c, 0x9b9a91];
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 6; column += 1) {
      const key = makeBox(
        `keyboard-key-${row}-${column}`,
        [0.027 * scale, 0.009 * scale, 0.024 * scale],
        [
          deskX + (column - 2.5) * 0.038 * scale,
          0.48 * scale,
          (row - 1) * 0.03 * scale + 0.08 * scale,
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
