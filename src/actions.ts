import { Entity, Transform, Vector3 } from "@iwsdk/core";
import { PanelLoadObjectSystem } from "./panelLoadObject";

export interface IAction {
  name: string;
  update(delta: number): void;
}

export class Actions {
  private actions: IAction[] = [];
  private activeAction: IAction | null = null;

  add(action: IAction) {
    this.actions.push(action);
  }

  remove(action: IAction) {
    if (this.activeAction === action) {
      this.activeAction = null;
    }
    this.actions = this.actions.filter((a) => a !== action);
  }

  setActive(action: IAction | null) {
    this.activeAction = action;
  }
  setActiveFirst() {
    this.activeAction = this.actions.length > 0 ? this.actions[0] : null;
  }

  getActive(): IAction | null {
    return this.activeAction;
  }

  clear() {
    this.actions = [];
  }

  update(delta: number) {
    if (!this.activeAction) {
      return;
    }
    // update only current active action
    this.activeAction.update(delta);
  }

  getAll(): IAction[] {
    return this.actions;
  }
}

export class ActionMoveTo implements IAction {
  name = "MoveTo";

  private entityID: string;
  private target: Vector3;
  private speed: number;

  constructor(entityID: string, target: Vector3, speed: number) {
    this.entityID = entityID;
    this.target = target;
    this.speed = speed;
  }

  update(delta: number) {
    const entity = PanelLoadObjectSystem.instance.entitiesDic.get(this.entityID);
    if (!entity) {
      console.warn(`Entity with ID ${this.entityID} not found for ActionMoveTo`);
      return;
    }
    const transform = entity.object3D?.position;
    if (!transform) {
        throw new Error("Entity does not have a Transform component or object3D position");
        return;
    }

    const direction = new Vector3(
      this.target.x - transform.x,
      this.target.y - transform.y,
      this.target.z - transform.z,
    );

    const distance = direction.length();
    if (distance <= 0.0001) return;

    direction.divideScalar(distance);
    const moveDistance = Math.min(this.speed * delta, distance);
    transform.addScaledVector(direction, moveDistance);

    if (entity.object3D) {
      // Keep ECS transform in sync through object3D
      entity.object3D.position.copy(transform);
    }
  }
}

export class ActionTeleportTo implements IAction {
  name = "TeleportTo";

  private entityID: string;
  private target: Vector3;

  constructor(entityID: string, target: Vector3) {
    this.entityID = entityID;
    this.target = target;
  }

  update(delta: number) {
    const entity = PanelLoadObjectSystem.instance.entitiesDic.get(this.entityID);
    if (!entity) {
      console.warn(`Entity with ID ${this.entityID} not found for ActionTeleportTo`);
      return;
    }
    // Keep ECS transform in sync through object3D
    entity.object3D?.position.copy(this.target);
  }
}
