/**
 * Runs before the app bundle to apply saved preferences and avoid theme flash.
 */
(function () {
  try {
    var root = document.documentElement;
    var DEFAULTS = {
      theme_mode: "light",
      theme_preset: "default",
      font: "geist",
      content_layout: "centered",
      navbar_style: "sticky",
      sidebar_variant: "inset",
      sidebar_collapsible: "icon",
    };

    function readCookie(name) {
      var match = document.cookie.split("; ").find(function (c) {
        return c.startsWith(name + "=");
      });
      return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
    }

    function readPreference(key) {
      return readCookie(key) || DEFAULTS[key];
    }

    var mode = readPreference("theme_mode");
    if (mode !== "dark" && mode !== "light" && mode !== "system") {
      mode = DEFAULTS.theme_mode;
    }

    var resolvedMode =
      mode === "system" && window.matchMedia
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : mode;

    root.classList.toggle("dark", resolvedMode === "dark");
    root.style.colorScheme = resolvedMode === "dark" ? "dark" : "light";
    root.setAttribute("data-theme-mode", mode);
    root.setAttribute("data-theme-preset", readPreference("theme_preset"));
    root.setAttribute("data-font", readPreference("font"));
    root.setAttribute("data-content-layout", readPreference("content_layout"));
    root.setAttribute("data-navbar-style", readPreference("navbar_style"));
    root.setAttribute("data-sidebar-variant", readPreference("sidebar_variant"));
    root.setAttribute("data-sidebar-collapsible", readPreference("sidebar_collapsible"));
  } catch (e) {
    console.warn("theme-boot.js error:", e);
  }
})();
