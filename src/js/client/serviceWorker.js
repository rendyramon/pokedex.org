var keyValueStore = require('../shared/db/keyValueStore');
var supportsWebp = require('../shared/util/supportsWebp');
var worker = require('./worker');
var semver = require('semver');

function onFirstLoad() {
  console.log('sw ready to work offline');
  // the very first activation!
  // tell the user stuff works offline
  keyValueStore.get('informedOffline').then(informed => {
    if (informed) {
      return;
    }

    worker.postMessage({
      type: 'toast',
      toast: {
        text: 'Ready to work offline.',
        buttonText: 'MORE INFO'
      },
      modal: {
        title: '\uD83D\uDCF6 \u00A0 Pokedex.org works offline.',
        text: "" +
        "Yes, that's right, a website that works offline! If you tap \u2630 then " +
        "\"Add to Home Screen,\" you can browse all your favorite " +
        "Pokémon even without an Internet connection.",
        buttonText: 'OK, COOL'
      }
    });
    return keyValueStore.set('informedOffline', true);
  }).catch(err => console.log(err));

}

function onClaimed() {
  console.log('sw claimed');
  navigator.serviceWorker.controller.postMessage({
    type: 'supportsWebp',
    value: supportsWebp()
  });
}

function onInstalled() {
  console.log('sw installed');

  keyValueStore.get('active-version').then(activeVersion => {
    // activeVersion is undefined for sw-null
    // if the main version has changed, bail
    if (activeVersion &&
      semver.parse(activeVersion).major !== semver.parse(self.version).major) {
      return;
    }
    console.log('activeVersion', activeVersion);
  }).catch(console.log.bind(console));
}

function onStateChange(newWorker) {
  if (newWorker.state == 'activated') {
    onFirstLoad();
    if (navigator.serviceWorker.controller) {
      onClaimed();
    }
  } else if (newWorker.state == 'installed' && navigator.serviceWorker.controller) {
    onInstalled();
  }
}

function onUpdateFound(registration) {
  var newWorker = registration.installing;

  registration.installing.addEventListener('statechange',
    () => onStateChange(newWorker));
}

// disable service worker while debugging
console.log('mode:', process.env.NODE_ENV);
if (process.env.NODE_ENV !== 'testing' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', {
    scope: './'
  }).then(registration => {
    registration.addEventListener('updatefound', () => onUpdateFound(registration));
  });
}