import { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wifi } from 'lucide-react-native';
import { useSync } from '../../contexts/SyncContext';
import { measureIcon } from '../../services/offlineIconPosition';
import { fonts } from '../../theme/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PAD = 20;
const ICON_SIZE = 32;
const TOAST_HEIGHT = 44;
const TOAST_WIDTH = SCREEN_WIDTH - H_PAD * 2;
const SHRINK_DURATION = 500;
const MORPH_DURATION = 300;
const MORPH_HOLD = 150; // brief pause after morph completes before expansion begins
const TOAST_DELAY = 800; // wait for TransitionOverlay pulse (350ms in + 450ms out)

type PillMode = 'offline' | 'online';

export function OfflineIndicator() {
  const { isOnline } = useSync();
  const insets = useSafeAreaInsets();
  const prevOnlineRef = useRef(isOnline);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Anchor at (0,0) of the container so we can convert measureInWindow coords
  // (window-absolute) into the container-relative coords that animTop/animLeft use.
  const anchorRef = useRef<View>(null);
  // True once the pill has fully shrunk and the icon is visible.
  const shrinkCompleteRef = useRef(false);

  const [pillMode, setPillMode] = useState<PillMode>('offline');

  const toastTop = insets.top + 50;

  const opacity = useSharedValue(0);
  const textOpacity = useSharedValue(1);
  const wifiIconOpacity = useSharedValue(0);
  const animTop = useSharedValue(toastTop);
  const animLeft = useSharedValue(H_PAD);
  const animWidth = useSharedValue(TOAST_WIDTH);
  const animHeight = useSharedValue(TOAST_HEIGHT);
  const animRadius = useSharedValue(14);

  function measureAnchor(): Promise<{ x: number; y: number }> {
    return new Promise((resolve) => {
      if (!anchorRef.current) {
        resolve({ x: 0, y: 0 });
        return;
      }
      anchorRef.current.measureInWindow((x, y) => resolve({ x, y }));
    });
  }

  async function shrinkToIcon() {
    const [pos, anchor] = await Promise.all([measureIcon(), measureAnchor()]);

    // Convert icon window position → container-relative position by subtracting
    // the container's own window origin measured via the anchor view.
    const targetLeft = pos ? pos.x - anchor.x : SCREEN_WIDTH - H_PAD - ICON_SIZE;
    const targetTop = pos ? pos.y - anchor.y : toastTop + 20;

    textOpacity.value = withTiming(0, { duration: 200 });
    animWidth.value = withTiming(ICON_SIZE, { duration: SHRINK_DURATION });
    animHeight.value = withTiming(ICON_SIZE, { duration: SHRINK_DURATION });
    animLeft.value = withTiming(targetLeft, { duration: SHRINK_DURATION });
    animTop.value = withTiming(targetTop, { duration: SHRINK_DURATION });
    animRadius.value = withTiming(ICON_SIZE / 2, { duration: SHRINK_DURATION });

    // Fade the pill out only after it has fully arrived at the icon position,
    // so the crossfade with the icon feels like one unified transformation.
    fadeTimerRef.current = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 200 });
      shrinkCompleteRef.current = true;
    }, SHRINK_DURATION);
  }

  async function expandFromIcon() {
    shrinkCompleteRef.current = false;

    const [pos, anchor] = await Promise.all([measureIcon(), measureAnchor()]);

    const iconLeft = pos ? pos.x - anchor.x : SCREEN_WIDTH - H_PAD - ICON_SIZE;
    const iconTop = pos ? pos.y - anchor.y : toastTop + 20;

    // Snap to icon position, invisible, before switching colour.
    animLeft.value = iconLeft;
    animTop.value = iconTop;
    animWidth.value = ICON_SIZE;
    animHeight.value = ICON_SIZE;
    animRadius.value = ICON_SIZE / 2;
    textOpacity.value = 0;
    wifiIconOpacity.value = 0;
    opacity.value = 0;
    setPillMode('online');

    // Yield so React re-renders the green colour before we fade in.
    setTimeout(() => {
      // Phase 1 — Morph: green circle + Wifi icon crossfade over the amber WifiOff (300ms, no movement).
      opacity.value = withTiming(1, { duration: MORPH_DURATION });
      wifiIconOpacity.value = withTiming(1, { duration: MORPH_DURATION });

      // Phase 2 — Expand: brief hold after morph, then Wifi icon snaps away and pill stretches.
      timerRef.current = setTimeout(() => {
        wifiIconOpacity.value = 0;
        animWidth.value = withTiming(TOAST_WIDTH, { duration: SHRINK_DURATION });
        animHeight.value = withTiming(TOAST_HEIGHT, { duration: SHRINK_DURATION });
        animLeft.value = withTiming(H_PAD, { duration: SHRINK_DURATION });
        animTop.value = withTiming(toastTop, { duration: SHRINK_DURATION });
        animRadius.value = withTiming(14, { duration: SHRINK_DURATION });

        // Phase 3 — Text fades in on arrival, holds 2 s, then fades out.
        fadeTimerRef.current = setTimeout(() => {
          textOpacity.value = withTiming(1, { duration: 200 });
          timerRef.current = setTimeout(() => {
            opacity.value = withTiming(0, { duration: 300 });
            timerRef.current = setTimeout(() => setPillMode('offline'), 300);
          }, 2000);
        }, SHRINK_DURATION);
      }, MORPH_DURATION + MORPH_HOLD);
    }, 0);
  }

  function showToast() {
    shrinkCompleteRef.current = false;
    setPillMode('offline');
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    animTop.value = toastTop;
    animLeft.value = H_PAD;
    animWidth.value = TOAST_WIDTH;
    animHeight.value = TOAST_HEIGHT;
    animRadius.value = 14;
    textOpacity.value = 1;
    wifiIconOpacity.value = 0;
    opacity.value = withSpring(1, { damping: 20, stiffness: 200 });

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(shrinkToIcon, 2000);
  }

  function hideToast() {
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    wifiIconOpacity.value = 0;
    opacity.value = withTiming(0, { duration: 300 });
  }

  function handleReconnect() {
    hideToast(); // cancel any pending timers; fades pill (no-op if already hidden)
    if (shrinkCompleteRef.current) {
      // Delay matches TOAST_DELAY — TransitionOverlay pulse fires on reconnect too (350ms in + 450ms out).
      showTimerRef.current = setTimeout(() => void expandFromIcon(), TOAST_DELAY);
    }
  }

  useEffect(() => {
    const wasOnline = prevOnlineRef.current;
    prevOnlineRef.current = isOnline;
    if (!isOnline && wasOnline) {
      showTimerRef.current = setTimeout(showToast, TOAST_DELAY);
    }
    if (isOnline && !wasOnline) handleReconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  useEffect(() => {
    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    top: animTop.value,
    left: animLeft.value,
    width: animWidth.value,
    height: animHeight.value,
    borderRadius: animRadius.value,
    opacity: opacity.value
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value
  }));

  const wifiIconStyle = useAnimatedStyle(() => ({
    opacity: wifiIconOpacity.value
  }));

  return (
    <>
      <View ref={anchorRef} style={styles.anchor} pointerEvents="none" />
      <Animated.View style={[styles.pill, pillMode === 'online' ? styles.pillOnline : styles.pillOffline, containerStyle]} pointerEvents="none">
        <Animated.View style={[styles.innerIcon, wifiIconStyle]}>
          <Wifi size={16} color="#5E7A42" />
        </Animated.View>
        <Animated.Text style={[styles.text, pillMode === 'online' ? styles.textOnline : null, textStyle]}>
          {pillMode === 'online' ? 'Back online' : "You're offline"}
        </Animated.Text>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 0,
    height: 0
  },
  pill: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 999,
    elevation: 4
  },
  pillOffline: {
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#D4A017'
  },
  pillOnline: {
    backgroundColor: '#E9F2E3',
    borderWidth: 1,
    borderColor: '#5E7A42'
  },
  innerIcon: {
    position: 'absolute'
  },
  text: {
    position: 'absolute',
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: '#856404'
  },
  textOnline: {
    color: '#5E7A42'
  }
});
