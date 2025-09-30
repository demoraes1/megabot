import {
  setExtensions,
  getExtensions,
  handleExtensionUpload as managerHandleUpload,
  displayExtension as managerDisplayExtension,
  removeExtension as managerRemoveExtension,
  updateExtensionCount as managerUpdateCount,
} from '../../extensions/manager.js';

function getAddedExtensions() {
  return getExtensions();
}

function handleExtensionUpload(event) {
  managerHandleUpload(event);
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
  displayExtension,
  removeExtension,
  updateExtensionCount,
};
