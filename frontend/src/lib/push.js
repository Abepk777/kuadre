import api from './axios';

export async function subscribeToPushNotifications() {
    if (!('serviceWorker' in navigator)) {
        console.log('Service workers are not supported by this browser');
        return;
    }
    if (!('PushManager' in window)) {
        console.log('Push notifications are not supported by this browser');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        // Solicitar permiso
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Notification permission not granted');
            return;
        }

        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
        });

        // Enviar al backend
        await api.post('/auth/push-subscribe', subscription);
        console.log('Push subscription sent to backend');

    } catch (e) {
        console.error('Error in push notification setup:', e);
    }
}

function urlBase64ToUint8Array(base64String) {
    if (!base64String) return new Uint8Array(0);
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
