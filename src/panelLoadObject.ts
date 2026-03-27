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
} from "@iwsdk/core";
import { GLTF } from "three/examples/jsm/Addons.js";
import { RotateObjectComponent } from "./rotateObject.js";

export class PanelLoadObjectSystem extends createSystem({
  loadObjectPanel: {
    required: [PanelUI, PanelDocument],
    where: [eq(PanelUI, "config", "./ui/loadObject.json")],
  },
}) {
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

  private parseBoundingBoxComponent(entity: any, data: any) {
    // Bounding box component - empty for now
    // TODO: Implement bounding box logic when needed
  }

  private async parseObjectFromJSON(jsonData: any, objectName: string) {
    try {
      const objectDef = jsonData[objectName];
      if (!objectDef) {
        throw new Error(`Object ${objectName} not found in JSON`);
      }

      let entity: Entity|null = null;

      // Process components in order
      for (const component of objectDef.components) {
        switch (component.type) {
          case "mesh":
            const gltf = await this.parseMeshComponent(component.data);
            entity = this.world.createTransformEntity(gltf.scene);
            break;
          case "transform":if (entity) {this.parseTransformComponent(entity, component.data);}break;
          case "interactable":if (entity) {this.parseInteractableComponent(entity, component.data);}break;
          case "distanceGrabbable":if (entity) {this.parseDistanceGrabbableComponent(entity, component.data);}break;
          case "boundingbox":if (entity) {this.parseBoundingBoxComponent(entity, component.data);}break;
          case "rotate":
            if (entity) {
              entity.addComponent(RotateObjectComponent, {
                axis: component.data.axis || 'y',
                speed: component.data.speed || 1.0
              });
            }
            break;
          default:console.warn(`Unknown component type: ${component.type}`);
        }
      }

      return { success: true, entity };
    } catch (err) {
      console.error(`Failed to parse object ${objectName}`, err);
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
    const result = await this.parseObjectFromJSON(tractorJson, "tractor");

    if (result.success) {
      xrButton.setProperties({ text: "Tractor loaded!" });
    } else {
      xrButton.setProperties({ text: "Tractor load failed" + result.error });
    }
  }

  init() {
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
}
