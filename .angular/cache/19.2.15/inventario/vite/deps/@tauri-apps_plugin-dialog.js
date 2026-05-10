import {
  invoke
} from "./chunk-NZX263BW.js";
import {
  __async
} from "./chunk-TXDUYLVM.js";

// node_modules/@tauri-apps/plugin-dialog/dist-js/index.js
function buttonsToRust(buttons) {
  if (buttons === void 0) {
    return void 0;
  }
  if (typeof buttons === "string") {
    return buttons;
  } else if ("ok" in buttons && "cancel" in buttons) {
    return {
      OkCancelCustom: [buttons.ok, buttons.cancel]
    };
  } else if ("yes" in buttons && "no" in buttons && "cancel" in buttons) {
    return {
      YesNoCancelCustom: [buttons.yes, buttons.no, buttons.cancel]
    };
  } else if ("ok" in buttons) {
    return {
      OkCustom: buttons.ok
    };
  }
  return void 0;
}
function open() {
  return __async(this, arguments, function* (options = {}) {
    if (typeof options === "object") {
      Object.freeze(options);
    }
    return yield invoke("plugin:dialog|open", {
      options
    });
  });
}
function save() {
  return __async(this, arguments, function* (options = {}) {
    if (typeof options === "object") {
      Object.freeze(options);
    }
    return yield invoke("plugin:dialog|save", {
      options
    });
  });
}
function message(message2, options) {
  return __async(this, null, function* () {
    const opts = typeof options === "string" ? {
      title: options
    } : options;
    return invoke("plugin:dialog|message", {
      message: message2.toString(),
      title: opts?.title?.toString(),
      kind: opts?.kind,
      okButtonLabel: opts?.okLabel?.toString(),
      buttons: buttonsToRust(opts?.buttons)
    });
  });
}
function ask(message2, options) {
  return __async(this, null, function* () {
    const opts = typeof options === "string" ? {
      title: options
    } : options;
    return yield invoke("plugin:dialog|ask", {
      message: message2.toString(),
      title: opts?.title?.toString(),
      kind: opts?.kind,
      yesButtonLabel: opts?.okLabel?.toString(),
      noButtonLabel: opts?.cancelLabel?.toString()
    });
  });
}
function confirm(message2, options) {
  return __async(this, null, function* () {
    const opts = typeof options === "string" ? {
      title: options
    } : options;
    return yield invoke("plugin:dialog|confirm", {
      message: message2.toString(),
      title: opts?.title?.toString(),
      kind: opts?.kind,
      okButtonLabel: opts?.okLabel?.toString(),
      cancelButtonLabel: opts?.cancelLabel?.toString()
    });
  });
}
export {
  ask,
  confirm,
  message,
  open,
  save
};
//# sourceMappingURL=@tauri-apps_plugin-dialog.js.map
