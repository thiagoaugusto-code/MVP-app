/**
 * Adapter concreto de persistência utilizando LocalStorage.
 * Implementa a interface necessária pelo DraftRepository:
 * - getItem(key)
 * - setItem(key, value)
 * - removeItem(key)
 * - keys()
 */
export class LocalStorageAdapter {
  getItem(key) {
    return localStorage.getItem(key);
  }

  setItem(key, value) {
    localStorage.setItem(key, value);
  }

  removeItem(key) {
    localStorage.removeItem(key);
  }

  keys() {
    return Object.keys(localStorage);
  }
}