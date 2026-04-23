/**
 * 入口文件
 *
 * 本文件为默认扩展入口文件，如果你想要配置其它文件作为入口文件，
 * 请修改 `extension.json` 中的 `entry` 字段；
 *
 * 请在此处使用 `export`  导出所有你希望在 `headerMenus` 中引用的方法，
 * 方法通过方法名与 `headerMenus` 关联。
 *
 * 如需了解更多开发细节，请阅读：
 * https://prodocs.lceda.cn/cn/api/guide/
 */
import * as extensionConfig from '../extension.json';

const EXPORT_PICK_DIR_TOPIC = 'yhb.export.pickDirectory';
const EXPORT_IFRAME_ID = 'yhb-export-pcb-frame';
const PICK_DIR_REQUEST_TYPE = 'yhb.export.pickDirectory.request';
const PICK_DIR_RESPONSE_TYPE = 'yhb.export.pickDirectory.response';
let pickDirectoryServiceRegistered = false;
let pickDirectoryMessageBridgeRegistered = false;

interface PickDirectoryRequest {
	preferredPath?: string;
}

interface PickDirectoryResponse {
	canceled: boolean;
	rawPath?: string;
	folderUri?: string;
	source?: 'native-dialog';
	errorCode?: 'PICKER_UNAVAILABLE' | 'PICKER_FAILED';
	errorMessage?: string;
}

interface ElectronDialogResult {
	canceled?: boolean;
	filePaths?: string[];
}

interface ElectronDialogLike {
	showOpenDialog?: (options: {
		title?: string;
		defaultPath?: string;
		properties: string[];
	}) => Promise<ElectronDialogResult>;
	showOpenDialogSync?: (options: {
		title?: string;
		defaultPath?: string;
		properties: string[];
	}) => string[] | undefined;
}

function trimRightSeparators(path: string): string {
	return path.replace(/[\\/]+$/, '');
}

function toFolderUri(path: string): string {
	const trimmed = trimRightSeparators(path);
	const sep = /\\/.test(trimmed) ? '\\' : '/';
	return `${trimmed}${sep}`;
}

function toRawPath(pathOrUri?: string): string | undefined {
	if (typeof pathOrUri !== 'string' || !pathOrUri.trim()) {
		return undefined;
	}
	return trimRightSeparators(pathOrUri.trim());
}

function getProcessModule(): { env?: Record<string, string | undefined> } | undefined {
	try {
		const globalAny = globalThis as {
			require?: (moduleName: string) => unknown;
			__non_webpack_require__?: (moduleName: string) => unknown;
		};

		const requireCandidates: Array<(moduleName: string) => unknown> = [];
		if (typeof globalAny.require === 'function') {
			requireCandidates.push(globalAny.require);
		}
		if (typeof globalAny.__non_webpack_require__ === 'function') {
			requireCandidates.push(globalAny.__non_webpack_require__);
		}

		for (const req of requireCandidates) {
			try {
				const processModule = req('process') as { env?: Record<string, string | undefined> } | undefined;
				if (processModule) {
					return processModule;
				}
			}
			catch (error) {
				console.warn('[yhb-eda-tools] resolve process module failed', error);
			}
		}
	}
	catch (error) {
		console.warn('[yhb-eda-tools] get process module failed', error);
	}
	return undefined;
}

function getDesktopPath(): string | undefined {
	try {
		const processApi = getProcessModule();
		const userProfile = processApi?.env?.USERPROFILE;
		if (typeof userProfile === 'string' && userProfile.trim()) {
			return `${trimRightSeparators(userProfile)}\\Desktop`;
		}
	}
	catch (error) {
		console.warn('[yhb-eda-tools] get desktop path failed', error);
	}
	return undefined;
}

function getElectronDialog(): ElectronDialogLike | undefined {
	try {
		const globalAny = globalThis as {
			electron?: { dialog?: ElectronDialogLike };
			require?: (moduleName: string) => unknown;
			__non_webpack_require__?: (moduleName: string) => unknown;
		};

		if (globalAny.electron?.dialog) {
			return globalAny.electron.dialog;
		}

		const requireCandidates: Array<(moduleName: string) => unknown> = [];
		if (typeof globalAny.require === 'function') {
			requireCandidates.push(globalAny.require);
		}
		if (typeof globalAny.__non_webpack_require__ === 'function') {
			requireCandidates.push(globalAny.__non_webpack_require__);
		}
		if (requireCandidates.length === 0) {
			return undefined;
		}

		for (const req of requireCandidates) {
			const electronUnknown = req('electron');
			const electron = electronUnknown as
				| {
					dialog?: ElectronDialogLike;
					remote?: { dialog?: ElectronDialogLike };
				}
				| undefined;

			if (electron?.dialog) {
				return electron.dialog;
			}
			if (electron?.remote?.dialog) {
				return electron.remote.dialog;
			}
		}
	}
	catch (error) {
		console.warn('[yhb-eda-tools] resolve electron dialog failed', error);
	}
	return undefined;
}

async function pickDirectoryInMainContext(message?: PickDirectoryRequest): Promise<PickDirectoryResponse> {
	const dialog = getElectronDialog();
	if (!dialog) {
		return {
			canceled: false,
			errorCode: 'PICKER_UNAVAILABLE',
			errorMessage: '主上下文不可用系统目录选择器。',
		};
	}

	try {
		const preferredPath = toRawPath(message?.preferredPath) || getDesktopPath();
		const options = {
			title: '选择导出目录',
			properties: ['openDirectory'],
			defaultPath: preferredPath,
		};

		let result: ElectronDialogResult;
		if (typeof dialog.showOpenDialog === 'function') {
			result = await dialog.showOpenDialog(options);
		}
		else if (typeof dialog.showOpenDialogSync === 'function') {
			const selected = dialog.showOpenDialogSync(options);
			result = {
				canceled: !selected || selected.length === 0,
				filePaths: selected || [],
			};
		}
		else {
			return {
				canceled: false,
				errorCode: 'PICKER_UNAVAILABLE',
				errorMessage: '系统目录选择器方法不可用。',
			};
		}

		const canceled = Boolean(result?.canceled);
		const filePaths = Array.isArray(result?.filePaths) ? result.filePaths : [];
		if (canceled || filePaths.length === 0) {
			return {
				canceled: true,
				source: 'native-dialog',
			};
		}

		const rawPath = toRawPath(filePaths[0]);
		if (!rawPath) {
			return {
				canceled: false,
				errorCode: 'PICKER_FAILED',
				errorMessage: '目录选择结果为空。',
			};
		}

		return {
			canceled: false,
			rawPath,
			folderUri: toFolderUri(rawPath),
			source: 'native-dialog',
		};
	}
	catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		return {
			canceled: false,
			errorCode: 'PICKER_FAILED',
			errorMessage,
		};
	}
}

function registerPickDirectoryService(): void {
	if (pickDirectoryServiceRegistered) {
		return;
	}
	try {
		eda.sys_MessageBus.createPrivateMessageBus();
	}
	catch (error) {
		console.warn('[yhb-eda-tools] createPrivateMessageBus failed', error);
	}
	try {
		eda.sys_MessageBus.rpcService(EXPORT_PICK_DIR_TOPIC, (message?: PickDirectoryRequest) => pickDirectoryInMainContext(message));
	}
	catch (error) {
		console.warn('[yhb-eda-tools] register private rpcService failed', error);
	}
	try {
		eda.sys_MessageBus.rpcServicePublic(EXPORT_PICK_DIR_TOPIC, (message?: PickDirectoryRequest) => pickDirectoryInMainContext(message));
	}
	catch (error) {
		console.warn('[yhb-eda-tools] register public rpcService failed', error);
	}
	pickDirectoryServiceRegistered = true;
}

function registerPickDirectoryMessageBridge(): void {
	if (pickDirectoryMessageBridgeRegistered) {
		return;
	}

	const windowLike = (globalThis as { window?: Window }).window;
	if (!windowLike || typeof windowLike.addEventListener !== 'function') {
		console.warn('[yhb-eda-tools] message bridge unavailable: window.addEventListener not found');
		return;
	}

	windowLike.addEventListener('message', (event: MessageEvent) => {
		const data = event.data as
			| {
				type?: string;
				requestId?: string;
				payload?: PickDirectoryRequest;
			}
			| undefined;
		if (!data || data.type !== PICK_DIR_REQUEST_TYPE || !data.requestId) {
			return;
		}

		void (async () => {
			const payload = data.payload;
			const result = await pickDirectoryInMainContext(payload);
			try {
				(event.source as Window | null)?.postMessage({
					type: PICK_DIR_RESPONSE_TYPE,
					requestId: data.requestId,
					payload: result,
				}, '*');
			}
			catch (error) {
				console.warn('[yhb-eda-tools] postMessage response failed', error);
			}
		})();
	});

	pickDirectoryMessageBridgeRegistered = true;
}

// eslint-disable-next-line unused-imports/no-unused-vars
export function activate(status?: 'onStartupFinished', arg?: string): void {
	registerPickDirectoryService();
	registerPickDirectoryMessageBridge();
}

export function about(): void {
	eda.sys_Dialog.showInformationMessage(
		eda.sys_I18n.text('EasyEDA extension SDK v', undefined, undefined, extensionConfig.version),
		eda.sys_I18n.text('About'),
	);
}

export async function openExportPcbPage(): Promise<void> {
	try {
		registerPickDirectoryService();
		registerPickDirectoryMessageBridge();
	}
	catch (error) {
		console.warn('[yhb-eda-tools] picker bridge/service init failed before opening iframe', error);
	}

	try {
		await eda.sys_IFrame.openIFrame('/iframe/export.html', 820, 640, EXPORT_IFRAME_ID, {
			title: '导出PCB资料',
			grayscaleMask: false,
		});
	}
	catch (error) {
		console.error('[yhb-eda-tools] failed to open export page', error);
		eda.sys_Dialog.showInformationMessage('打开导出页面失败，请稍后重试。', '导出PCB资料');
	}
}
