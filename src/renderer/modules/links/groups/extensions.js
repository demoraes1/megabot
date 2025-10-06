import {
  setExtensions,
  getExtensions,
  handleExtensionUpload as managerHandleUpload,
  displayExtension as managerDisplayExtension,
  removeExtension as managerRemoveExtension,
  updateExtensionCount as managerUpdateCount,
  openExtensionSelector as managerOpenSelector,
} from '../../extensions/manager.js';

function getAddedExtensions() {
  return getExtensions();
}

function handleExtensionUpload(event) {
  managerHandleUpload(event);
}

function openExtensionSelector() {
  managerOpenSelector();
}

function displayExtension(entry) {
  managerDisplayExtension(entry);
}

function removeExtension(reference) {
  managerRemoveExtension(reference);
}

function updateExtensionCount() {
  managerUpdateCount();
}

export {
  setExtensions,
  getAddedExtensions,
  handleExtensionUpload,
  openExtensionSelector,
  displayExtension,
  removeExtension,
  updateExtensionCount,
};



