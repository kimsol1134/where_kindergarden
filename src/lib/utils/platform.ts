import { Capacitor } from '@capacitor/core';

/**
 * 현재 플랫폼이 네이티브(iOS/Android)인지 확인
 */
export const isNative = (): boolean => Capacitor.isNativePlatform();

/**
 * 현재 플랫폼이 iOS인지 확인
 */
export const isIOS = (): boolean => Capacitor.getPlatform() === 'ios';

/**
 * 현재 플랫폼이 Android인지 확인
 */
export const isAndroid = (): boolean => Capacitor.getPlatform() === 'android';

/**
 * 현재 플랫폼이 웹인지 확인
 */
export const isWeb = (): boolean => Capacitor.getPlatform() === 'web';
