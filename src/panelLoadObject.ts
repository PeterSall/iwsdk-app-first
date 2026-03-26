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
} from "@iwsdk/core";

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

  init() {
    this.queries.loadObjectPanel.subscribe("qualify", (entity) => {
      const document = PanelDocument.data.document[
        entity.index
      ] as UIKitDocument;
      if (!document) {
        return;
      }

      const xrButton = document.getElementById("xr-button") as UIKit.Text;
      xrButton.addEventListener("click", async () => {
        const modelUrl = "https://neandertale.com/";
        xrButton.setProperties({ text: "Loading Tractor..." });

        //const result = await this.loadAndPlaceObject("https://neandertale.com/imi/Tractor.gltf", { x: 0, y: 3, z: -2 });

        const result = await this.loadAndPlaceObject("https://neandertale.com/imi/Tractor.gltf", { x: 0, y: 3, z: -2 });

        if (result.success) {
          xrButton.setProperties({ text: "Tractor loaded!" });
        } else {
          xrButton.setProperties({ text: "Tractor load failed" });
        }
      });
    });
  }
}
