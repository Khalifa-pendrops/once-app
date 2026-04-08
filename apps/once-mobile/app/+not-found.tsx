import React from 'react';
import { Link, Stack } from 'expo-router';
import { View, Text, TouchableOpacity } from 'react-native';

const StyledView = View as any;
const StyledText = Text as any;
const StyledTouchableOpacity = TouchableOpacity as any;

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Missing Route', headerShown: false }} />
      <StyledView className="flex-1 bg-background items-center justify-center px-8">
        <StyledText className="text-muted font-mono text-[10px] uppercase tracking-[3px] mb-3">
          secure://null-route
        </StyledText>
        <StyledText className="text-3xl font-bold tracking-tight mb-4" style={{ color: '#F6C177' }}>
          Route Not Found
        </StyledText>
        <StyledText className="text-center font-mono text-xs uppercase tracking-[2px] mb-8" style={{ color: '#8B8B8B' }}>
          {'> requested surface does not exist inside this vault map'}
        </StyledText>

        <Link href="/" asChild>
          <StyledTouchableOpacity className="px-5 py-4" style={{ borderWidth: 1, borderColor: 'rgba(246, 193, 119, 0.3)', borderRadius: 4, backgroundColor: '#050505' }}>
            <StyledText className="font-mono text-xs uppercase tracking-[3px]" style={{ color: '#F6C177' }}>
              Return Home
            </StyledText>
          </StyledTouchableOpacity>
        </Link>
      </StyledView>
    </>
  );
}
