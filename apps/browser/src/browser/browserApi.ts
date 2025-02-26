import BrowserPlatformUtilsService from "../services/browserPlatformUtils.service";
import { TabMessage } from "../types/tab-messages";

export class BrowserApi {
  static isWebExtensionsApi: boolean = typeof browser !== "undefined";
  static isSafariApi: boolean =
    navigator.userAgent.indexOf(" Safari/") !== -1 &&
    navigator.userAgent.indexOf(" Chrome/") === -1 &&
    navigator.userAgent.indexOf(" Chromium/") === -1;
  static isChromeApi: boolean = !BrowserApi.isSafariApi && typeof chrome !== "undefined";
  static isFirefoxOnAndroid: boolean =
    navigator.userAgent.indexOf("Firefox/") !== -1 && navigator.userAgent.indexOf("Android") !== -1;

  static get manifestVersion() {
    return chrome.runtime.getManifest().manifest_version;
  }

  static async getTabFromCurrentWindowId(): Promise<chrome.tabs.Tab> | null {
    return await BrowserApi.tabsQueryFirst({
      active: true,
      windowId: chrome.windows.WINDOW_ID_CURRENT,
    });
  }

  static async getTab(tabId: number) {
    if (tabId == null) {
      return null;
    }
    return await chrome.tabs.get(tabId);
  }

  static async getTabFromCurrentWindow(): Promise<chrome.tabs.Tab> | null {
    return await BrowserApi.tabsQueryFirst({
      active: true,
      currentWindow: true,
    });
  }

  static async getActiveTabs(): Promise<chrome.tabs.Tab[]> {
    return await BrowserApi.tabsQuery({
      active: true,
    });
  }

  static async tabsQuery(options: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> {
    return new Promise((resolve) => {
      chrome.tabs.query(options, (tabs) => {
        resolve(tabs);
      });
    });
  }

  static async tabsQueryFirst(options: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab> | null {
    const tabs = await BrowserApi.tabsQuery(options);
    if (tabs.length > 0) {
      return tabs[0];
    }

    return null;
  }

  static tabSendMessageData(
    tab: chrome.tabs.Tab,
    command: string,
    data: any = null
  ): Promise<void> {
    const obj: any = {
      command: command,
    };

    if (data != null) {
      obj.data = data;
    }

    return BrowserApi.tabSendMessage(tab, obj);
  }

  static async tabSendMessage<T>(
    tab: chrome.tabs.Tab,
    obj: T,
    options: chrome.tabs.MessageSendOptions = null
  ): Promise<void> {
    if (!tab || !tab.id) {
      return;
    }

    return new Promise<void>((resolve) => {
      chrome.tabs.sendMessage(tab.id, obj, options, () => {
        if (chrome.runtime.lastError) {
          // Some error happened
        }
        resolve();
      });
    });
  }

  static sendTabsMessage<T>(
    tabId: number,
    message: TabMessage,
    options?: chrome.tabs.MessageSendOptions,
    responseCallback?: (response: T) => void
  ) {
    chrome.tabs.sendMessage<TabMessage, T>(tabId, message, options, responseCallback);
  }

  static async getPrivateModeWindows(): Promise<browser.windows.Window[]> {
    return (await browser.windows.getAll()).filter((win) => win.incognito);
  }

  static async onWindowCreated(callback: (win: chrome.windows.Window) => any) {
    return chrome.windows.onCreated.addListener(callback);
  }

  static getBackgroundPage(): any {
    return chrome.extension.getBackgroundPage();
  }

  static isBackgroundPage(window: Window & typeof globalThis): boolean {
    return window === chrome.extension.getBackgroundPage();
  }

  static getApplicationVersion(): string {
    return chrome.runtime.getManifest().version;
  }

  static async isPopupOpen(): Promise<boolean> {
    return Promise.resolve(chrome.extension.getViews({ type: "popup" }).length > 0);
  }

  static createNewTab(url: string, extensionPage = false, active = true) {
    chrome.tabs.create({ url: url, active: active });
  }

  static messageListener(
    name: string,
    callback: (message: any, sender: chrome.runtime.MessageSender, response: any) => void
  ) {
    chrome.runtime.onMessage.addListener(
      (msg: any, sender: chrome.runtime.MessageSender, response: any) => {
        callback(msg, sender, response);
      }
    );
  }

  static sendMessage(subscriber: string, arg: any = {}) {
    const message = Object.assign({}, { command: subscriber }, arg);
    return chrome.runtime.sendMessage(message);
  }

  static async closeLoginTab() {
    const tabs = await BrowserApi.tabsQuery({
      active: true,
      title: "Bitwarden",
      windowType: "normal",
      currentWindow: true,
    });

    if (tabs.length === 0) {
      return;
    }

    const tabToClose = tabs[tabs.length - 1].id;
    chrome.tabs.remove(tabToClose);
  }

  static async focusSpecifiedTab(tabId: number) {
    chrome.tabs.update(tabId, { active: true, highlighted: true });
  }

  static closePopup(win: Window) {
    if (BrowserApi.isWebExtensionsApi && BrowserApi.isFirefoxOnAndroid) {
      // Reactivating the active tab dismisses the popup tab. The promise final
      // condition is only called if the popup wasn't already dismissed (future proofing).
      // ref: https://bugzilla.mozilla.org/show_bug.cgi?id=1433604
      browser.tabs.update({ active: true }).finally(win.close);
    } else {
      win.close();
    }
  }

  static gaFilter() {
    return process.env.ENV !== "production";
  }

  static getUILanguage(win: Window) {
    return chrome.i18n.getUILanguage();
  }

  static reloadExtension(win: Window) {
    if (win != null) {
      return (win.location as any).reload(true);
    } else {
      return chrome.runtime.reload();
    }
  }

  static reloadOpenWindows() {
    const views = chrome.extension.getViews() as Window[];
    views
      .filter((w) => w.location.href != null)
      .forEach((w) => {
        w.location.reload();
      });
  }

  static connectNative(application: string): browser.runtime.Port | chrome.runtime.Port {
    if (BrowserApi.isWebExtensionsApi) {
      return browser.runtime.connectNative(application);
    } else if (BrowserApi.isChromeApi) {
      return chrome.runtime.connectNative(application);
    }
  }

  static requestPermission(permission: any) {
    if (BrowserApi.isWebExtensionsApi) {
      return browser.permissions.request(permission);
    }
    return new Promise((resolve, reject) => {
      chrome.permissions.request(permission, resolve);
    });
  }

  static getPlatformInfo(): Promise<browser.runtime.PlatformInfo | chrome.runtime.PlatformInfo> {
    if (BrowserApi.isWebExtensionsApi) {
      return browser.runtime.getPlatformInfo();
    }
    return new Promise((resolve) => {
      chrome.runtime.getPlatformInfo(resolve);
    });
  }

  static getBrowserAction() {
    return BrowserApi.manifestVersion === 3 ? chrome.action : chrome.browserAction;
  }

  static getSidebarAction(win: Window & typeof globalThis) {
    return BrowserPlatformUtilsService.isSafari(win)
      ? null
      : typeof win.opr !== "undefined" && win.opr.sidebarAction
      ? win.opr.sidebarAction
      : win.chrome.sidebarAction;
  }
}
