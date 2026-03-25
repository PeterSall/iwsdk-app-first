import {
  createSystem,
  PanelUI,
  PanelDocument,
  eq,
  VisibilityState,
  UIKitDocument,
  UIKit,
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
      xrButton.addEventListener("click", () => {
        xrButton.setProperties({ text: "You will now load an object!" });
      });
    });
  }
}
