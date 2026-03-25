import {
  createSystem,
  PanelUI,
  PanelDocument,
  eq,
  VisibilityState,
  UIKitDocument,
  UIKit,
  AssetManager,
  Interactable,
} from "@iwsdk/core";

export class PanelLoadObjectSystem extends createSystem({
  loadObjectPanel: {
    required: [PanelUI, PanelDocument],
    where: [eq(PanelUI, "config", "./ui/loadObject.json")],
  },
}) {
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

        try {
          //const gltf = await AssetManager.loadGLTF(modelUrl, "Tractor.gltf");
          const gltf = await AssetManager.loadGLTF("https://neandertale.com/Tractor.gltf");
          const tractor = gltf.scene;
          tractor.position.set(0, 0, -2);

          const tractorEntity = this.world.createTransformEntity(tractor);
          tractorEntity.addComponent(Interactable);

          xrButton.setProperties({ text: "Tractor loaded!" });
        } catch (err) {
          console.error("Failed to load Tractor.gltf", err);
          xrButton.setProperties({ text: "Tractor load failed" });
        }
      });
    });
  }
}
