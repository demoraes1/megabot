// Estado compartilhado entre os módulos do renderer

export const state = {
  defaults: {
    width: 800,
    height: 1200,
    fallbackWidth: 502,
    fallbackHeight: 800,
  },
  monitors: {
    detected: [],
    selected: null,
    positioning: [],
    maxCapacity: 24,
  },
  profiles: {
    list: [],
    filtered: [],
    filtersInitialized: false,
    statusListenerRegistered: false,
    profilesListenerRegistered: false,
  },
  saveTimeoutId: null,
};

export function setSaveTimeoutId(timeoutId) {
  state.saveTimeoutId = timeoutId;
}

export function clearSaveTimeout() {
  if (state.saveTimeoutId) {
    clearTimeout(state.saveTimeoutId);
    state.saveTimeoutId = null;
  }
}

export function updateDefaults(partialDefaults) {
  state.defaults = { ...state.defaults, ...partialDefaults };
}
