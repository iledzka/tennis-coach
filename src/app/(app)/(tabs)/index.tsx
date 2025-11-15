import Stack, { VStack } from '@nkzw/stack';
import { Link, Stack as ExpoStack } from 'expo-router';
import { fbs } from 'fbtee';
import { TouchableOpacity, View } from 'react-native';
import { cx } from 'src/lib/cx.tsx';
import Text from 'src/ui/Text.tsx';

export default function Index() {
  return (
    <>
      <ExpoStack.Screen
        options={{ title: String(fbs('Home', 'Home header title')) }}
      />
      <VStack alignCenter center flex1 gap={16} padding>
        <Text className="text-center text-xl font-bold color-accent">
          <fbt desc="Greeting">Welcome</fbt>
        </Text>
        <Text className="text-center italic">
          <fbt desc="Tagline">Modern, sensible defaults, fast.</fbt>
        </Text>
        <Stack alignCenter center gap={4}>
          <Text className="text-center">
            <fbt desc="Live update message">
              Change{' '}
              <View
                className={cx(
                  'inline-flex rounded border border-accent bg-subtle p-1',
                  'android:translate-y-[9px] ios:translate-y-[9px]',
                )}
              >
                <Text>src/app/(app)/(tabs)/index.tsx</Text>
              </View>{' '}
              for live updates.
            </fbt>
          </Text>
        </Stack>
        <Stack gap={16} className="mt-8">
          <Link href="/pose-detection-webview" asChild>
            <TouchableOpacity
              className="rounded-lg bg-accent px-6 py-3"
            >
              <Text className="text-center font-bold text-white">
                <fbt desc="Pose detection button">Live Pose Detection</fbt>
              </Text>
            </TouchableOpacity>
          </Link>
          
          <Link href="/video-analysis" asChild>
            <TouchableOpacity
              className="rounded-lg bg-accent px-6 py-3"
            >
              <Text className="text-center font-bold text-white">
                <fbt desc="Video analysis button">Analyze Video</fbt>
              </Text>
            </TouchableOpacity>
          </Link>
        </Stack>
      </VStack>
    </>
  );
}
