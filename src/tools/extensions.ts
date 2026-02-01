/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {zod} from '../third_party/index.js';

import {ToolCategory} from './categories.js';
import {defineTool} from './ToolDefinition.js';

const EXTENSIONS_CONDITION = 'experimentalExtensionSupport';

export const installExtension = defineTool({
  name: 'install_extension',
  description: 'Installs a Chrome extension from the given path.',
  annotations: {
    category: ToolCategory.EXTENSIONS,
    readOnlyHint: false,
    conditions: [EXTENSIONS_CONDITION],
  },
  schema: {
    path: zod
      .string()
      .describe('Absolute path to the unpacked extension folder.'),
  },
  handler: async (request, response, context) => {
    const {path} = request.params;
    const id = await context.installExtension(path);
    response.appendResponseLine(`Extension installed. Id: ${id}`);
  },
});

export const uninstallExtension = defineTool({
  name: 'uninstall_extension',
  description: 'Uninstalls a Chrome extension by its ID.',
  annotations: {
    category: ToolCategory.EXTENSIONS,
    readOnlyHint: false,
    conditions: [EXTENSIONS_CONDITION],
  },
  schema: {
    id: zod.string().describe('ID of the extension to uninstall.'),
  },
  handler: async (request, response, context) => {
    const {id} = request.params;
    await context.uninstallExtension(id);
    response.appendResponseLine(`Extension uninstalled. Id: ${id}`);
  },
});

export const listExtensions = defineTool({
  name: 'list_extensions',
  description:
    'Lists all extensions via this server, including their name, ID, version, and enabled status.',
  annotations: {
    category: ToolCategory.EXTENSIONS,
    readOnlyHint: true,
    conditions: [EXTENSIONS_CONDITION],
  },
  schema: {},
  handler: async (_request, response, _context) => {
    response.setListExtensions();
  },
});

export const reloadExtension = defineTool({
  name: 'reload_extension',
  description: 'Reloads an unpacked Chrome extension by its ID.',
  annotations: {
    category: ToolCategory.EXTENSIONS,
    readOnlyHint: false,
    conditions: [EXTENSIONS_CONDITION],
  },
  schema: {
    id: zod.string().describe('ID of the extension to reload.'),
  },
  handler: async (request, response, context) => {
    const {id} = request.params;
    const extension = context.getExtension(id);
    if (!extension) {
      throw new Error(`Extension with ID ${id} not found.`);
    }
    await context.installExtension(extension.path);
    response.appendResponseLine('Extension reloaded.');
  },
});

export const openExtensionSidepanel = defineTool({
  name: 'open_extension_sidepanel',
  description: `Opens an extension's sidepanel for debugging. Due to Chrome security restrictions,
the sidepanel opens in a detached popup window rather than docked to the browser sidebar.
This provides full debugging capabilities (DOM inspection, console access, script evaluation)
with identical code execution to docked mode. Only visual docking/layout differs.

After opening, use list_pages to see the sidepanel and select_page to interact with it.`,
  annotations: {
    category: ToolCategory.DEBUGGING,
    readOnlyHint: false,
  },
  schema: {
    extensionId: zod
      .string()
      .describe(
        'The ID of the extension whose sidepanel should be opened. ' +
        'Find extension IDs at chrome://extensions or from list_pages service worker URLs.',
      ),
  },
  handler: async (request, response, context) => {
    try {
      const result = await context.openExtensionSidepanel(request.params.extensionId);

      response.appendResponseLine(`# Sidepanel Opened Successfully`);
      response.appendResponseLine('');
      response.appendResponseLine(`**URL:** ${result.url}`);
      response.appendResponseLine(`**Window ID:** ${result.windowId}`);
      response.appendResponseLine('');
      response.appendResponseLine(`> ${result.note}`);
      response.appendResponseLine('');
      response.appendResponseLine('Use `list_pages` to see the sidepanel and `select_page` to interact with it.');

      response.setIncludePages(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      response.appendResponseLine(`# Failed to Open Sidepanel`);
      response.appendResponseLine('');
      response.appendResponseLine(`**Error:** ${errorMessage}`);
      response.appendResponseLine('');
      response.appendResponseLine('**Troubleshooting:**');
      response.appendResponseLine('- Ensure the extension is installed and enabled');
      response.appendResponseLine('- Verify the extension has a `side_panel.default_path` in its manifest.json');
      response.appendResponseLine('- Check that the extension has a service worker running');
      response.appendResponseLine('- Use `list_pages` to see available service workers');
    }
  },
});
