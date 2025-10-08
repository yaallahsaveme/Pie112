"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vite_1 = require("vite");
const plugin_react_1 = __importDefault(require("@vitejs/plugin-react"));
const path_1 = __importDefault(require("path"));
let vitePluginCartographer = null;
let vitePluginRuntimeErrorModal = null;
try {
    const cartographer = await Promise.resolve().then(() => __importStar(require("@replit/vite-plugin-cartographer")));
    vitePluginCartographer = cartographer.vitePluginCartographer;
}
catch (e) {
    console.log("Cartographer plugin not available");
}
try {
    const errorModal = await Promise.resolve().then(() => __importStar(require("@replit/vite-plugin-runtime-error-modal")));
    vitePluginRuntimeErrorModal = errorModal.vitePluginRuntimeErrorModal;
}
catch (e) {
    console.log("Runtime error modal plugin not available");
}
exports.default = (0, vite_1.defineConfig)({
    plugins: [
        (0, plugin_react_1.default)(),
        vitePluginCartographer ? vitePluginCartographer() : null,
        vitePluginRuntimeErrorModal ? vitePluginRuntimeErrorModal() : null,
    ].filter(Boolean),
    resolve: {
        alias: {
            "@": path_1.default.resolve(__dirname, "./client/src"),
            "@shared": path_1.default.resolve(__dirname, "./shared"),
        },
    },
    build: {
        outDir: "dist",
        sourcemap: true,
        rollupOptions: {
            external: [
                'fsevents',
                'chokidar',
                'esbuild',
                'rollup'
            ],
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
                }
            }
        },
        commonjsOptions: {
            include: [/node_modules/],
            transformMixedEsModules: true
        }
    },
    server: {
        host: "0.0.0.0",
        port: 5000,
        proxy: {
            "/api": {
                target: "http://localhost:3000",
                changeOrigin: true,
            },
        },
    },
    optimizeDeps: {
        include: ['react', 'react-dom'],
        exclude: ['fsevents']
    }
});
