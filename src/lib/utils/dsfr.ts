// Import main styles from the DSFR
import "@gouvfr/dsfr/dist/dsfr.min.css";

// Import colors from the DSFR
import "@gouvfr/dsfr/dist/utility/colors/colors.min.css";

// Import icons from the DSFR
import "@gouvfr/dsfr/dist/utility/icons/icons-business/icons-business.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-communication/icons-communication.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-design/icons-design.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-document/icons-document.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-health/icons-health.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-map/icons-map.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-media/icons-media.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-others/icons-others.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-system/icons-system.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-weather/icons-weather.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-editor/icons-editor.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-development/icons-development.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-user/icons-user.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons-buildings/icons-buildings.min.css";

// Initialize the DSFR library if running in a browser environment
export async function initDsfr() {
  if (typeof window !== "undefined") {
    await Promise.all([import("@gouvfr/dsfr/dist/dsfr.module.min.js")]);
  }
}
