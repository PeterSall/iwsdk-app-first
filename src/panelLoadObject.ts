import {
  createSystem,
  PanelUI,
  PanelDocument,
  eq,
  VisibilityState,
  DistanceGrabbable,
  UIKitDocument,
  UIKit,
  AssetManager,
  Interactable,
  MovementMode,
  Entity,
  Object3D,
  Vector3,
} from "@iwsdk/core";
import { GLTF } from "three/examples/jsm/Addons.js";
import { RotateObjectComponent } from "./rotateObject.js";
import { Actions, ActionMoveTo, ActionTeleportTo } from "./actions.js";

export class PanelLoadObjectSystem extends createSystem({
  loadObjectPanel: {
    required: [PanelUI, PanelDocument],
    where: [eq(PanelUI, "config", "./ui/loadObject.json")],
  },
}) {

  public entitiesDic = new Map<string, Entity>();
  public actions: Actions[] = [];
  //public entities: Entity[] = [];
  public static instance: PanelLoadObjectSystem;

  private async loadAndPlaceObject(url: string, position: { x: number; y: number; z: number }) {
    try {
      const gltf = await AssetManager.loadGLTF(url);
      const tractor = gltf.scene;
      tractor.position.set(position.x, position.y, position.z);

      const tractorEntity = this.world.createTransformEntity(tractor);
      tractorEntity.addComponent(Interactable).addComponent(DistanceGrabbable, {
        movementMode: MovementMode.MoveFromTarget,
      });

      return { success: true };
    } catch (err) {
      console.error("Failed to load Tractor.gltf", err);
      return { success: false, error: err };
    }
  }

  private async parseMeshComponent(data: any): Promise<GLTF> {
    if (data.ref) {
      // ref is expected to be a URL to a GLTF file
      const gltf = await AssetManager.loadGLTF(data.ref);
      return gltf;
    }
    throw new Error("Mesh component missing ref field");
  }

  private parseTransformComponent(entity: Entity, data: any) {
    let obj : Object3D = entity.object3D!;
    if (data.pos && Array.isArray(data.pos) && data.pos.length === 3) {
      obj.position.set(data.pos[0], data.pos[1], data.pos[2]);
    }
    if (data.rot && Array.isArray(data.rot) && data.rot.length === 3) {
      const degToRad = Math.PI / 180;
      obj.rotation.set(data.rot[0] * degToRad, data.rot[1] * degToRad, data.rot[2] * degToRad);
    }
    if (data.scale !== undefined) {
      if (Array.isArray(data.scale) && data.scale.length === 3) {
        obj.scale.set(data.scale[0], data.scale[1], data.scale[2]);
      } else {
        obj.scale.setScalar(data.scale);
      }
    }
  }

  private parseInteractableComponent(entity: Entity, data: any) {
    entity.addComponent(Interactable);
  }

  private parseDistanceGrabbableComponent(entity: Entity, data: any) {
    entity.addComponent(DistanceGrabbable, {
      movementMode: MovementMode.MoveFromTarget,
    });
  }

  private parseBoundingBoxComponent(entity: Entity, data: any) {
    // Bounding box component - empty for now
    // TODO: Implement bounding box logic when needed
  }

  private parseRotateComponent(entity: Entity, data: any) {
    entity.addComponent(RotateObjectComponent, {
      axis: (data.axis || 'y').toLowerCase(),
      speed: data.speed != null ? data.speed : 1.0,
    });
  }

  private async parseType3DMesh(objectDef: any) {
    if (!objectDef || !Array.isArray(objectDef.components)) {
      //console.warn(`Skipping invalid object definition: ${objectName}`);
      return null;
    }

    let entity: Entity|null = null;

    for (const component of objectDef.components) {
      switch (component.type) {
        case "mesh":
          if (entity != null)
              throw new Error("Multiple mesh components found for a single object. Only one mesh component is allowed per object.");
          const gltf = await this.parseMeshComponent(component.data);
          // Must clone, so we can have multiple instances of the same GLTF in the scene
          const meshClone = gltf.scene.clone(true);
          entity = this.world.createTransformEntity(meshClone);
          break;
        case "transform":
          if (entity) { this.parseTransformComponent(entity, component.data); }
          break;
        case "interactable":
          if (entity) { this.parseInteractableComponent(entity, component.data); }
          break;
        case "distanceGrabbable":
          if (entity) { this.parseDistanceGrabbableComponent(entity, component.data); }
          break;
        case "boundingbox":
          if (entity) { this.parseBoundingBoxComponent(entity, component.data); }
          break;
        case "rotate":
          if (entity) { this.parseRotateComponent(entity, component.data); }
          break;
        default:
          console.warn(`Unknown component type: ${component.type}`);
      }
    }
    return entity;
  }

  private parseTypeActions(objectDef: any) : Actions|null {
    if (!objectDef || !Array.isArray(objectDef.components)) {
      //console.warn(`Skipping invalid object definition: ${objectName}`);
      return null;
    }

    let actions: Actions = new Actions();

    for (const component of objectDef.components) {
      switch (component.type) {
        case "ActionMoveTo":
          actions.add(new ActionMoveTo(
            component.data.id,
            new Vector3(component.data.target[0], component.data.target[1], component.data.target[2]),
            component.data.speed
          ));
          break;
        case "ActionTeleportTo":
          actions.add(new ActionTeleportTo(
            component.data.id,
            new Vector3(component.data.target[0], component.data.target[1], component.data.target[2])
          ));
          break;
        default:
          console.warn(`Unknown component type: ${component.type}`);
      }
    }

    actions.setActiveFirst();
    
    console.error(`Test output: ${actions.getAll().length} actions parsed`);
    return actions;
  }


  private async parseObjectFromJSON(jsonData: any) {
    try {
      const objectNames = Object.keys(jsonData);
      if (objectNames.length === 0) {
        throw new Error("JSON contains no objects to parse");
      }

      for (const objectName of objectNames) {
        const objectDef = jsonData[objectName];

        const type : string = objectDef.type;
        const id : string = objectDef.id;

        switch (type) {
          case "3dMesh":
            let entity: Entity|null = null;
            entity = await this.parseType3DMesh(objectDef);
            if (entity) {
              this.entitiesDic.set(id, entity);
            }
            break;
          case "actions":
            const actions = this.parseTypeActions(objectDef);
            this.actions.push(actions!);
            break;
          default:
            console.warn(`Unknown object type: ${type} for object ${objectName}`);
        }
      }

      return { success: true };
    } catch (err) {
      console.error("Failed to parse JSON objects", err);
      return { success: false, error: err };
    }
  }

  private async onLoadObjectButtonClick(xrButton: UIKit.Text) {
    xrButton.setProperties({ text: "Loading Tractor..." });

    const response = await fetch("https://neandertale.com/imi/tractor3.json");
    if (!response.ok) {
      console.error("Failed to fetch tractor JSON", response.statusText);
      xrButton.setProperties({ text: "Tractor load failed" });
      return;
    }

    const tractorJson = await response.json();
    const result = await this.parseObjectFromJSON(tractorJson);

    if (result.success) {
      const loadedModels = this.entitiesDic.size;
      const loadedActions = this.actions.length;
      xrButton.setProperties({ text: `Tractor loaded! (${loadedModels} models, ${loadedActions} actions)` });
    } else {
      xrButton.setProperties({ text: "Tractor load failed" + result.error });
    }
  }

  init() {
    PanelLoadObjectSystem.instance = this;

    this.queries.loadObjectPanel.subscribe("qualify", (entity) => {
      const document = PanelDocument.data.document[
        entity.index
      ] as UIKitDocument;
      if (!document) {
        return;
      }

      const xrButton = document.getElementById("xr-button") as UIKit.Text;

      this.onLoadObjectButtonClick(xrButton);

      xrButton.addEventListener("click", async () => {
        await this.onLoadObjectButtonClick(xrButton);
      });
    });
  }

  // Here we can run the logic for loaded objects, especially for non entities like actions.
  // (other objects that uses the ECS already run their update logic)
  update(delta: number, time: number): void {
      for (const actions of this.actions) {
        actions.update(delta);
      }
  }
}
