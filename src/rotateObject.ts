import {
  createComponent,
  createSystem,
  Transform,
  Types,
  Vector3,
} from "@iwsdk/core";

export const RotateObjectComponent = createComponent("RotateObjectComponent", {
  axis: { type: Types.String, default: 'y' },
  speed: { type: Types.Float32, default: 1.0 }, // degrees per second
});

export class RotateObjectSystem extends createSystem({
  rotating: { required: [RotateObjectComponent, Transform] },
}) {
  update(delta: number) {
    this.queries.rotating.entities.forEach((entity) => {
      const axis = (entity.getValue(RotateObjectComponent, 'axis') as string).toLowerCase();
      const speed = entity.getValue(RotateObjectComponent, 'speed') as number;
      const obj3D = entity.object3D;
      if (!obj3D) return;

      const radiansDelta = (speed * (Math.PI / 180)) * delta;

      if (axis === 'x') {
        obj3D.rotateX(radiansDelta);
      } else if (axis === 'y') {
        obj3D.rotateY(radiansDelta);
      } else if (axis === 'z') {
        obj3D.rotateZ(radiansDelta);
      }
    });
  }
}