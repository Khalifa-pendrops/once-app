import React from 'react';
import { View, Text } from 'react-native';

const StyledView = View as any;
const StyledText = Text as any;

export default function TabTwoScreen() {
  return (
    <StyledView className="flex-1 bg-background items-center justify-center px-8">
      <StyledText className="text-muted font-mono text-[10px] uppercase tracking-[3px] mb-3">
        secure://stats-node
      </StyledText>
      <StyledText className="text-3xl font-bold tracking-tight mb-4" style={{ color: '#F6C177' }}>
        Metrics Pending
      </StyledText>
      <StyledText className="text-center font-mono text-xs uppercase tracking-[2px]" style={{ color: '#8B8B8B' }}>
        {'> telemetry surface reserved // analytical screens not yet wired'}
      </StyledText>
    </StyledView>
  );
}
