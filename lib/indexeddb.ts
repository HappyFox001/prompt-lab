import { Conversation, SystemPrompt, UserPrompt } from './types';

const DB_NAME = 'promptlab';
const DB_VERSION = 3; // 升级数据库版本以添加 userPrompts 存储
const STORE_NAME = 'conversations';
const SYSTEM_PROMPTS_STORE = 'systemPrompts';
const USER_PROMPTS_STORE = 'userPrompts'; // 新增用户提示词存储

// 打开数据库
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 创建对话存储
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        objectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // 创建系统提示词存储
      if (!db.objectStoreNames.contains(SYSTEM_PROMPTS_STORE)) {
        const promptStore = db.createObjectStore(SYSTEM_PROMPTS_STORE, { keyPath: 'id' });
        promptStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // 创建用户提示词存储
      if (!db.objectStoreNames.contains(USER_PROMPTS_STORE)) {
        const userPromptStore = db.createObjectStore(USER_PROMPTS_STORE, { keyPath: 'id' });
        userPromptStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
  });
}

export const indexedDB_storage = {
  // 获取所有对话
  async getConversations(): Promise<Conversation[]> {
    if (typeof window === 'undefined') return [];

    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('updatedAt');

      return new Promise((resolve, reject) => {
        const request = index.openCursor(null, 'prev'); // 按更新时间倒序
        const conversations: Conversation[] = [];

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const conv = cursor.value;
            // 转换日期字符串为 Date 对象
            conversations.push({
              ...conv,
              createdAt: new Date(conv.createdAt),
              updatedAt: new Date(conv.updatedAt),
              messages: conv.messages.map((msg: any) => ({
                ...msg,
                timestamp: new Date(msg.timestamp),
              })),
            });
            cursor.continue();
          } else {
            resolve(conversations);
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to load conversations from IndexedDB:', error);
      return [];
    }
  },

  // 保存所有对话
  async saveConversations(conversations: Conversation[]): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // 清空现有数据
      await new Promise<void>((resolve, reject) => {
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
      });

      // 保存新数据
      for (const conv of conversations) {
        await new Promise<void>((resolve, reject) => {
          const request = store.add(conv);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    } catch (error) {
      console.error('Failed to save conversations to IndexedDB:', error);
    }
  },

  // 保存单个对话
  async saveConversation(conversation: Conversation): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      await new Promise<void>((resolve, reject) => {
        const request = store.put(conversation);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to save conversation to IndexedDB:', error);
    }
  },

  // 删除对话
  async deleteConversation(id: string): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      await new Promise<void>((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to delete conversation from IndexedDB:', error);
    }
  },

  // 清空所有对话
  async clearConversations(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to clear conversations from IndexedDB:', error);
    }
  },

  // ===== 系统提示词管理 =====

  // 获取所有系统提示词
  async getSystemPrompts(): Promise<SystemPrompt[]> {
    if (typeof window === 'undefined') return [];

    try {
      const db = await openDB();
      const transaction = db.transaction(SYSTEM_PROMPTS_STORE, 'readonly');
      const store = transaction.objectStore(SYSTEM_PROMPTS_STORE);
      const index = store.index('updatedAt');

      return new Promise((resolve, reject) => {
        const request = index.openCursor(null, 'prev'); // 按更新时间倒序
        const prompts: SystemPrompt[] = [];

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const prompt = cursor.value;
            prompts.push({
              ...prompt,
              createdAt: new Date(prompt.createdAt),
              updatedAt: new Date(prompt.updatedAt),
            });
            cursor.continue();
          } else {
            resolve(prompts);
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to load system prompts from IndexedDB:', error);
      return [];
    }
  },

  // 获取单个系统提示词
  async getSystemPrompt(id: string): Promise<SystemPrompt | null> {
    if (typeof window === 'undefined') return null;

    try {
      const db = await openDB();
      const transaction = db.transaction(SYSTEM_PROMPTS_STORE, 'readonly');
      const store = transaction.objectStore(SYSTEM_PROMPTS_STORE);

      return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => {
          const prompt = request.result;
          if (prompt) {
            resolve({
              ...prompt,
              createdAt: new Date(prompt.createdAt),
              updatedAt: new Date(prompt.updatedAt),
            });
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get system prompt from IndexedDB:', error);
      return null;
    }
  },

  // 保存系统提示词
  async saveSystemPrompt(prompt: SystemPrompt): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const db = await openDB();
      const transaction = db.transaction(SYSTEM_PROMPTS_STORE, 'readwrite');
      const store = transaction.objectStore(SYSTEM_PROMPTS_STORE);

      await new Promise<void>((resolve, reject) => {
        const request = store.put(prompt);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to save system prompt to IndexedDB:', error);
    }
  },

  // 删除系统提示词
  async deleteSystemPrompt(id: string): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const db = await openDB();
      const transaction = db.transaction(SYSTEM_PROMPTS_STORE, 'readwrite');
      const store = transaction.objectStore(SYSTEM_PROMPTS_STORE);

      await new Promise<void>((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to delete system prompt from IndexedDB:', error);
    }
  },

  // ===== 用户提示词管理 =====

  // 获取所有用户提示词
  async getUserPrompts(): Promise<UserPrompt[]> {
    if (typeof window === 'undefined') return [];

    try {
      const db = await openDB();
      const transaction = db.transaction(USER_PROMPTS_STORE, 'readonly');
      const store = transaction.objectStore(USER_PROMPTS_STORE);
      const index = store.index('updatedAt');

      return new Promise((resolve, reject) => {
        const request = index.openCursor(null, 'prev'); // 按更新时间倒序
        const prompts: UserPrompt[] = [];

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const prompt = cursor.value;
            prompts.push({
              ...prompt,
              createdAt: new Date(prompt.createdAt),
              updatedAt: new Date(prompt.updatedAt),
            });
            cursor.continue();
          } else {
            resolve(prompts);
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to load user prompts from IndexedDB:', error);
      return [];
    }
  },

  // 获取单个用户提示词
  async getUserPrompt(id: string): Promise<UserPrompt | null> {
    if (typeof window === 'undefined') return null;

    try {
      const db = await openDB();
      const transaction = db.transaction(USER_PROMPTS_STORE, 'readonly');
      const store = transaction.objectStore(USER_PROMPTS_STORE);

      return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => {
          const prompt = request.result;
          if (prompt) {
            resolve({
              ...prompt,
              createdAt: new Date(prompt.createdAt),
              updatedAt: new Date(prompt.updatedAt),
            });
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get user prompt from IndexedDB:', error);
      return null;
    }
  },

  // 保存用户提示词
  async saveUserPrompt(prompt: UserPrompt): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const db = await openDB();
      const transaction = db.transaction(USER_PROMPTS_STORE, 'readwrite');
      const store = transaction.objectStore(USER_PROMPTS_STORE);

      await new Promise<void>((resolve, reject) => {
        const request = store.put(prompt);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to save user prompt to IndexedDB:', error);
    }
  },

  // 删除用户提示词
  async deleteUserPrompt(id: string): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const db = await openDB();
      const transaction = db.transaction(USER_PROMPTS_STORE, 'readwrite');
      const store = transaction.objectStore(USER_PROMPTS_STORE);

      await new Promise<void>((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to delete user prompt from IndexedDB:', error);
    }
  },
};
