import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView, MotiText, AnimatePresence } from 'moti';
import { COLORS } from '../../constants/theme';

const StyledView = View as any;
const StyledText = Text as any;
const StyledMotiView = MotiView as any;
const StyledMotiText = MotiText as any;

const TERMINAL_AMBER = '#F6C177';
const TERMINAL_CYAN = '#67E8F9';

interface CyberLoaderProps {
  type?: 'pulse' | 'scan' | 'decrypt';
  label?: string;
  color?: string;
  size?: number;
}

export const CyberLoader: React.FC<CyberLoaderProps> = ({ 
  type = 'pulse', 
  label, 
  color = TERMINAL_AMBER,
  size = 24 
}) => {
  if (type === 'decrypt') {
    return <DecryptingText label={label || 'DECRYPTING'} color={color} />;
  }

  if (type === 'scan') {
    return (
      <StyledView style={{ width: size * 2, height: size }} className="justify-center">
        <StyledMotiView
          from={{ translateX: -size }}
          animate={{ translateX: size }}
          transition={{
            type: 'timing',
            duration: 1000,
            loop: true,
          }}
          style={{
            width: 2,
            height: '100%',
            backgroundColor: color,
            shadowColor: color,
            shadowOpacity: 0.8,
            shadowRadius: 4,
          }}
        />
        {label && (
          <StyledText 
            className="font-mono text-[8px] uppercase absolute -bottom-4 left-0 right-0 text-center"
            style={{ color: COLORS.muted }}
          >
            {label}
          </StyledText>
        )}
      </StyledView>
    );
  }

  // Default: Pulse
  return (
    <StyledView style={{ width: size, height: size }} className="items-center justify-center">
      <StyledMotiView
        from={{ scale: 0.6, opacity: 1 }}
        animate={{ scale: 1.2, opacity: 0 }}
        transition={{
          type: 'timing',
          duration: 1000,
          loop: true,
        }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: color,
          position: 'absolute',
        }}
      />
      <StyledMotiView
        from={{ scale: 0.8, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: 'timing',
          duration: 1000,
          loop: true,
          delay: 200,
        }}
        style={{
          width: size / 2,
          height: size / 2,
          borderRadius: size / 4,
          backgroundColor: color,
          shadowColor: color,
          shadowOpacity: 0.5,
          shadowRadius: 4,
        }}
      />
    </StyledView>
  );
};

const DecryptingText: React.FC<{ label: string; color: string }> = ({ label, color }) => {
  const [displayText, setDisplayText] = useState(label);
  const chars = '!@#$%^&*()_+{}[]|;:,.<>?0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  useEffect(() => {
    const interval = setInterval(() => {
      const scrambled = label
        .split('')
        .map((char) => (Math.random() > 0.7 ? chars[Math.floor(Math.random() * chars.length)] : char))
        .join('');
      setDisplayText(scrambled);
    }, 80);

    return () => clearInterval(interval);
  }, [label]);

  return (
    <StyledMotiText
      from={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: 100, loop: true }}
      className="font-mono text-[10px] uppercase tracking-[2px]"
      style={{ color }}
    >
      {`> ${displayText}`}
    </StyledMotiText>
  );
};
