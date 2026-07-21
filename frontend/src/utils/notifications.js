/**
 * Request permission from user to show native browser push notifications
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support system notifications.');
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
};

/**
 * Trigger a native system notification with a title and optional body
 */
export const sendPushNotification = (title, body = '') => {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico' || 'https://splitroom-eta.vercel.app/favicon.ico',
        badge: '/favicon.ico',
      });
    } catch (err) {
      // In mobile Chrome inside PWAs, standard new Notification() might throw,
      // fallback to service worker registration showNotification if active
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            body,
            icon: '/favicon.ico',
          });
        });
      }
    }
  } else {
    console.log('Notification permission not granted. Message:', title, body);
  }
};
