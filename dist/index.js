"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }// src/preload.ts
var _unplugin = require('unplugin');
var _magicstring = require('magic-string'); var _magicstring2 = _interopRequireDefault(_magicstring);
var preload = _unplugin.createUnplugin.call(void 0, (_options) => {
  return {
    name: "unplugin-auto-expose-preload",
    renderChunk(code, info) {
      if (!info.isEntry) {
        return;
      }
      const transformed = new (0, _magicstring2.default)(code);
      transformed.append("\nconst {contextBridge} = require('electron');\n");
      for (const exp of info.exports) {
        transformed.append(`;
contextBridge.exposeInMainWorld('__electron_preload__${exp}', exports.${exp});
`);
      }
      return {
        code: transformed.toString(),
        map: transformed.generateMap()
      };
    }
  };
});

// src/renderer.ts


// src/scanExports.ts
var _promises = require('fs/promises');
var _mlly = require('mlly');
async function scanExports(filepath) {
  const imports = [];
  const code = await _promises.readFile.call(void 0, filepath, "utf-8");
  const exports = _mlly.findExports.call(void 0, code);
  const defaultExport = exports.find((i) => i.type === "default");
  if (defaultExport) {
    imports.push({ name: "default", as: "default", from: filepath });
  }
  for (const exp of exports) {
    if (exp.type === "named") {
      for (const name of exp.names) {
        imports.push({ name, as: name, from: filepath });
      }
    } else if (exp.type === "declaration") {
      if (exp.name) {
        imports.push({ name: exp.name, as: exp.name, from: filepath });
      }
    }
  }
  return imports;
}

// src/renderer.ts
var renderer = _unplugin.createUnplugin.call(void 0, (options) => {
  const virtualModuleId = "#preload";
  const resolvedVirtualModuleId = "\0" + virtualModuleId.replace("#", "@");
  return {
    name: "unplugin-auto-expose-renderer",
    resolveId(source) {
      if (source === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },
    async load(id) {
      if (id === resolvedVirtualModuleId) {
        if (!(options == null ? void 0 : options.preloadEntry)) {
          this.error("Could not load preload module, did you forget to set preloadEntry in vite.config.ts?");
          return;
        }
        const exp = await scanExports(options.preloadEntry);
        const names = new Set(exp.map((e) => e.as === "src" ? "default" : e.as));
        return [...names].reduce((code, name) => {
          const exportName = name === "default" ? "default" : `const ${name} =`;
          return code + `export ${exportName} globalThis.__electron_preload__${name};
`;
        }, "");
      }
    }
  };
});



exports.preload = preload; exports.renderer = renderer;
