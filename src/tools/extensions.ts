/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {zod} from '../third_party/index.js';

import {ToolCategory} from './categories.js';
import {defineTool} from './ToolDefinition.js';

export const installExtension = defineTool({
  name: 'install_extension',
  description: 'Installs a Chrome extension from the given path.',
  annotations: {
    category: ToolCategory.EXTENSIONS,
    readOnlyHint: false,
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
    'Lists extensions installed via this server (using install_extension), including their name, ID, version, and path. ' +
    'Note: Pre-installed browser extensions are not shown here. Use list_pages to see all extension service workers.',
  annotations: {
    category: ToolCategory.EXTENSIONS,
    readOnlyHint: true,
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

Requirements:
- Extension must have a service worker running (check list_pages for service workers)
- Extension must have side_panel.default_path in manifest.json

After opening, use list_pages to see the sidepanel and select_page to interact with it.`,
  annotations: {
    category: ToolCategory.EXTENSIONS,
    readOnlyHint: false,
  },
  schema: {
    id: zod
      .string()
      .describe(
        'The extension ID. Find IDs via list_pages (shown in Service Workers section) ' +
        'or list_extensions (for extensions installed via this server).',
      ),
  },
  handler: async (request, response, context) => {
    const result = await context.openExtensionSidepanel(request.params.id);

    response.appendResponseLine(`Sidepanel opened: ${result.url}`);
    response.appendResponseLine('');
    response.appendResponseLine(`> ${result.note}`);

    response.setIncludePages(true);
  },
});
