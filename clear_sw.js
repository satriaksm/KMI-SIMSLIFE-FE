navigator.serviceWorker.getRegistrations().then((registrations) => {
  for (let registration of registrations) {
    if (!registration.active.scriptURL.includes('public/sw.js')) {
        registration.unregister();
    }
  }
});
