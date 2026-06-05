export {}

declare global {
  namespace chrome {
    namespace runtime {
      const lastError: { message?: string } | undefined

      function sendMessage(message: unknown, callback: (response: unknown) => void): void

      const onMessage: {
        addListener(
          callback: (
            message: unknown,
            sender: MessageSender,
            sendResponse: (response?: unknown) => void,
          ) => boolean | void,
        ): void
      }

      interface MessageSender {
        tab?: tabs.Tab
      }
    }

    namespace tabs {
      interface Tab {
        id?: number
        url?: string
      }

      function query(queryInfo: { active: boolean; currentWindow: boolean }, callback: (tabs: Tab[]) => void): void
      function sendMessage(tabId: number, message: unknown, callback: (response: unknown) => void): void
    }

    namespace scripting {
      function executeScript(
        injection: {
          target: { tabId: number }
          files: string[]
        },
        callback?: () => void,
      ): void
    }

    namespace storage {
      interface StorageArea {
        get(keys: string | string[] | Record<string, unknown> | null, callback: (items: Record<string, unknown>) => void): void
        set(items: Record<string, unknown>, callback?: () => void): void
        remove(keys: string | string[], callback?: () => void): void
      }

      const local: StorageArea
    }
  }
}
